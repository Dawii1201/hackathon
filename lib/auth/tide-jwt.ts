import type { JWTPayload } from "jose";
import { verifyTideCloakToken } from "@tidecloak/nextjs/server";
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
    const payload = await verifyTideCloakToken(
      { ...config, tokenSignatureAlgorithms: ["ES256", "ES384", "ES512", "EdDSA"] },
      token,
    );
    if (!payload) throw new TideAuthenticationError();

    if (payload.iss !== issuerFor(config)) {
      throw new TideAuthenticationError("Token issuer does not match the Tide realm");
    }
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

    return payload as JWTPayload;
  } catch (error) {
    if (error instanceof TideAuthenticationError) throw error;
    throw new TideAuthenticationError();
  }
}

export function rolesFromTideClaims(payload: JWTPayload, clientId?: string): string[] {
  const realmRoles = Array.isArray((payload.realm_access as { roles?: unknown } | undefined)?.roles)
    ? (payload.realm_access as { roles: unknown[] }).roles.filter((role): role is string => typeof role === "string")
    : [];
  const resourceAccess = (payload.resource_access as Record<string, { roles?: unknown }> | undefined) ?? {};
  const clients = clientId ? [resourceAccess[clientId]] : Object.values(resourceAccess);
  const clientRoles = clients.filter(Boolean).flatMap((client) => Array.isArray(client?.roles)
    ? client.roles.filter((role): role is string => typeof role === "string")
    : []);
  return [...new Set([...realmRoles, ...clientRoles])];
}

export function hasTideRole(payload: JWTPayload, role: string, clientId?: string): boolean {
  return rolesFromTideClaims(payload, clientId).includes(role);
}
