import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { JWK } from "jose";

export interface TideAdapterConfig {
  realm: string;
  "auth-server-url": string;
  resource: string;
  jwk: { keys: JWK[] };
  vendorId?: string;
  homeOrkUrl?: string;
  [key: string]: unknown;
}

function parseConfig(raw: string, source: string): TideAdapterConfig {
  let config: unknown;
  try {
    config = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid Tide adapter JSON from ${source}`);
  }

  if (!config || typeof config !== "object") {
    throw new Error(`Invalid Tide adapter JSON from ${source}`);
  }

  const candidate = config as Partial<TideAdapterConfig>;
  if (
    typeof candidate.realm !== "string" ||
    typeof candidate["auth-server-url"] !== "string" ||
    typeof candidate.resource !== "string" ||
    !candidate.jwk ||
    !Array.isArray(candidate.jwk.keys) ||
    candidate.jwk.keys.length === 0
  ) {
    throw new Error(
      `Tide adapter from ${source} must include realm, auth-server-url, resource, and embedded jwk.keys`,
    );
  }

  return candidate as TideAdapterConfig;
}

/** Loads only the Tide adapter supplied by the realm owner. */
export function loadTideConfig(): TideAdapterConfig {
  const encoded = process.env.TIDECLOAK_CONFIG_B64;
  if (encoded) {
    return parseConfig(
      Buffer.from(encoded, "base64").toString("utf8"),
      "TIDECLOAK_CONFIG_B64",
    );
  }

  const inline = process.env.CLIENT_ADAPTER;
  if (inline) return parseConfig(inline, "CLIENT_ADAPTER");

  const configPath = process.env.TIDECLOAK_CONFIG_PATH ??
    join(process.cwd(), "data", "tidecloak.json");
  try {
    return parseConfig(readFileSync(configPath, "utf8"), configPath);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Tide adapter")) {
      throw error;
    }
    throw new Error(
      `Tide adapter not found at ${configPath}. Export it from the configured TideCloak realm before starting protected APIs.`,
    );
  }
}
