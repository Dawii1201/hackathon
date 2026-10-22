import type { JWTPayload } from "jose";
import { verifyDpopProof } from "./dpop";
import { hasTideRole, TideAuthenticationError, verifyTideAccessToken } from "./tide-jwt";
import type { TideAdapterConfig } from "./tide-config";

export interface ProtectedRequest {
  method: string;
  url: string;
  headers: Headers;
}

export interface AuthenticatedRequestContext {
  token: string;
  claims: JWTPayload;
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
  const claims = await verifyTideAccessToken(token, options.config);
  const requireDpop = options.requireDpop ?? process.env.TIDECLOAK_REQUIRE_DPOP !== "false";
  if (requireDpop) {
    if (scheme !== "DPoP") throw new TideAuthenticationError("DPoP authorization is required");
    await verifyDpopProof(token, claims, request);
  }
  return { token, claims };
}

export async function requireRole(
  request: ProtectedRequest,
  role: "renter" | "landlord" | "admin",
  options: { config?: TideAdapterConfig; requireDpop?: boolean } = {},
): Promise<AuthenticatedRequestContext> {
  const context = await authenticateRequest(request, options);
  if (!hasTideRole(context.claims, role)) {
    throw new TideAuthenticationError(`Required role is missing: ${role}`);
  }
  return context;
}
