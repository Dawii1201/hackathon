import type { JWTPayload } from "jose";
import { verifyDpopProof } from "./dpop";
import { hasTideRole, TideAuthenticationError, verifyTideAccessToken } from "./tide-jwt";
import { loadTideConfig, type TideAdapterConfig } from "./tide-config";

export interface ProtectedRequest {
  method: string;
  url: string;
  headers: Headers;
}

export interface AuthenticatedRequestContext {
  token: string;
  claims: JWTPayload;
  config: TideAdapterConfig;
}

/** The token was valid, but it is not permitted to perform this operation. */
export class TideAuthorizationError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "TideAuthorizationError";
  }
}

function tokenFromRequest(request: ProtectedRequest): { token: string; scheme: string } {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^(Bearer|DPoP)\s+(.+)$/);
  if (!match) throw new TideAuthenticationError("Missing or invalid Authorization header");
  return { token: match[2], scheme: match[1] };
}

export async function authenticateRequest(
  request: ProtectedRequest,
  options: { config?: TideAdapterConfig; requireDpop?: boolean } = {},
): Promise<AuthenticatedRequestContext> {
  const { token, scheme } = tokenFromRequest(request);
  const config = options.config ?? loadTideConfig();
  const claims = await verifyTideAccessToken(token, config);
  const requireDpop = options.requireDpop ?? process.env.TIDECLOAK_REQUIRE_DPOP !== "false";
  if (requireDpop) {
    if (scheme !== "DPoP") throw new TideAuthenticationError("DPoP authorization is required");
    await verifyDpopProof(token, claims, request);
  }
  return { token, claims, config };
}

export async function requireRole(
  request: ProtectedRequest,
  role: "renter" | "landlord" | "admin",
  options: { config?: TideAdapterConfig; requireDpop?: boolean } = {},
): Promise<AuthenticatedRequestContext> {
  const context = await authenticateRequest(request, options);
  if (!hasTideRole(context.claims, role, context.config.resource)) {
    throw new TideAuthorizationError(`Required role is missing: ${role}`);
  }
  if ((role === "renter" || role === "landlord") && hasTideRole(context.claims, "admin", context.config.resource)) {
    throw new TideAuthorizationError("Administrator tokens cannot impersonate a rental party");
  }
  return context;
}
