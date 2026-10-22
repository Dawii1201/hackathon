import { createLocalJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { TideAdapterConfig } from "./tide-config";
import { loadTideConfig } from "./tide-config";

export class TideAuthenticationError extends Error {
  constructor(message = "Invalid TideCloak token") {
    super(message);
    this.name = "TideAuthenticationError";
  }
}

function issuerFor(config: TideAdapterConfig): string {
  return `${config["auth-server-url"].replace(/\/+$/, "")}/realms/${config.realm}`;
}

export async function verifyTideAccessToken(
  token: string,
  config: TideAdapterConfig = loadTideConfig(),
): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, createLocalJWKSet(config.jwk), {
      issuer: issuerFor(config),
    });

    if (payload.azp !== config.resource) {
      throw new TideAuthenticationError("Token azp does not match the Tide client");
    }

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp <= now) {
      throw new TideAuthenticationError("Token is expired or has no expiry");
    }
    if (typeof payload.iat === "number" && payload.iat > now + 60) {
      throw new TideAuthenticationError("Token was issued in the future");
    }

    return payload;
  } catch (error) {
    if (error instanceof TideAuthenticationError) throw error;
    throw new TideAuthenticationError();
  }
}

export function rolesFromTideClaims(payload: JWTPayload): string[] {
  const realmRoles = Array.isArray((payload.realm_access as { roles?: unknown } | undefined)?.roles)
    ? (payload.realm_access as { roles: unknown[] }).roles.filter((role): role is string => typeof role === "string")
    : [];
  const clientRoles = Object.values(
    (payload.resource_access as Record<string, { roles?: unknown }> | undefined) ?? {},
  ).flatMap((client) => Array.isArray(client.roles)
    ? client.roles.filter((role): role is string => typeof role === "string")
    : []);
  return [...new Set([...realmRoles, ...clientRoles])];
}

export function hasTideRole(payload: JWTPayload, role: string): boolean {
  return rolesFromTideClaims(payload).includes(role);
}
