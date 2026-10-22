import { NextResponse, type NextRequest } from "next/server";
import { TideAuthorizationError, authenticateRequest } from "../auth/guards";
import { loadTideConfig } from "../auth/tide-config";
import { hasTideRole, TideAuthenticationError } from "../auth/tide-jwt";
import { BondServiceError, type BondActor } from "./service";

export async function actorFromRequest(request: NextRequest): Promise<BondActor> {
  let config;
  try {
    config = loadTideConfig();
  } catch {
    throw new TideAuthenticationError("TideCloak adapter is not configured");
  }
  const context = await authenticateRequest(
    {
      method: request.method,
      url: request.url,
      headers: request.headers,
    },
    { config },
  );
  const tideClaims = context.claims as typeof context.claims & { vuid?: unknown };
  const identity = typeof tideClaims.vuid === "string"
    ? tideClaims.vuid
    : typeof context.claims.sub === "string"
      ? context.claims.sub
      : null;
  if (!identity) throw new TideAuthenticationError("Token has no Tide user identity");

  // An admin claim wins over party claims. The service then rejects party-only
  // operations, so an administrator cannot impersonate either party.
  if (hasTideRole(context.claims, "admin", config.resource)) return { id: identity, role: "admin" };
  const partyRoles = (["renter", "landlord"] as const).filter((role) => hasTideRole(context.claims, role, config.resource));
  if (partyRoles.length !== 1) throw new TideAuthorizationError("Exactly one rental party role is required");
  return { id: identity, role: partyRoles[0] };
}

export function jsonData<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof BondServiceError) {
    const status = error.code === "NOT_FOUND" ? 404 : error.code === "FORBIDDEN" ? 403 : error.code === "UNAUTHORIZED" ? 401 : ["STALE_VERSION", "PAYLOAD_MISMATCH", "APPROVAL_QUORUM_INCOMPLETE", "DUPLICATE_APPROVAL", "TRANSACTION_REPLAY", "RELEASE_ALREADY_EXISTS", "DISPUTE_OPEN"].includes(error.code) ? 409 : 400;
    return NextResponse.json({ error: error.code, message: error.message }, { status });
  }
  if (error instanceof TideAuthorizationError) return NextResponse.json({ error: "FORBIDDEN", message: error.message }, { status: 403 });
  if (error instanceof TideAuthenticationError) return NextResponse.json({ error: "UNAUTHORIZED", message: error.message }, { status: 401 });
  return NextResponse.json({ error: "INVALID_INPUT", message: "Request could not be processed." }, { status: 400 });
}

export async function readJson<T>(request: NextRequest): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    throw new BondServiceError("INVALID_INPUT", "Request body must be valid JSON.");
  }
}
