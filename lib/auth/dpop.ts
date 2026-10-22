import { createHash } from "node:crypto";
import {
  calculateJwkThumbprint,
  decodeProtectedHeader,
  importJWK,
  jwtVerify,
  type JWK,
  type JWTPayload,
} from "jose";
import { TideAuthenticationError } from "./tide-jwt";

export interface DpopRequest {
  method: string;
  url: string;
  headers: Headers;
  now?: number;
}

export class DpopReplayCache {
  private readonly entries = new Map<string, number>();

  assertUnused(jti: string, now: number, ttlSeconds = 120): void {
    for (const [storedJti, expiresAt] of this.entries) {
      if (expiresAt <= now) this.entries.delete(storedJti);
    }
    if (this.entries.has(jti)) {
      throw new TideAuthenticationError("DPoP proof has already been used");
    }
    this.entries.set(jti, now + ttlSeconds);
  }
}

const defaultReplayCache = new DpopReplayCache();

function accessTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

function requestTarget(url: string): string {
  const parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname}`;
}

/** Verifies the RFC 9449 proof against the TideCloak token binding. */
export async function verifyDpopProof(
  accessToken: string,
  tokenPayload: JWTPayload,
  request: DpopRequest,
  replayCache: DpopReplayCache = defaultReplayCache,
): Promise<void> {
  const proof = request.headers.get("dpop");
  if (!proof) throw new TideAuthenticationError("Missing DPoP proof");

  try {
    const protectedHeader = decodeProtectedHeader(proof);
    if (protectedHeader.typ !== "dpop+jwt") throw new TideAuthenticationError("Invalid DPoP proof type");
    if (protectedHeader.alg !== "ES256" && protectedHeader.alg !== "EdDSA") {
      throw new TideAuthenticationError("Unsupported DPoP proof algorithm");
    }
    if (!protectedHeader.jwk || typeof protectedHeader.jwk !== "object") {
      throw new TideAuthenticationError("DPoP proof has no public key");
    }

    const proofKey = await importJWK(protectedHeader.jwk as JWK, protectedHeader.alg);
    const { payload } = await jwtVerify(proof, proofKey, { algorithms: [protectedHeader.alg] });
    const now = request.now ?? Math.floor(Date.now() / 1000);
    if (typeof payload.iat !== "number" || Math.abs(now - payload.iat) > 120) {
      throw new TideAuthenticationError("DPoP proof is stale");
    }
    if (typeof payload.jti !== "string" || payload.jti.length === 0) {
      throw new TideAuthenticationError("DPoP proof has no jti");
    }
    if (payload.htm !== request.method.toUpperCase()) {
      throw new TideAuthenticationError("DPoP method does not match the request");
    }
    if (payload.htu !== requestTarget(request.url)) {
      throw new TideAuthenticationError("DPoP URL does not match the request");
    }
    if (payload.ath !== accessTokenHash(accessToken)) {
      throw new TideAuthenticationError("DPoP proof is not bound to this access token");
    }

    const tokenJkt = (tokenPayload.cnf as { jkt?: unknown } | undefined)?.jkt;
    if (typeof tokenJkt !== "string") throw new TideAuthenticationError("Access token is not DPoP-bound");
    const proofJkt = await calculateJwkThumbprint(protectedHeader.jwk as JWK, "sha256");
    if (proofJkt !== tokenJkt) throw new TideAuthenticationError("DPoP key does not match the access token");

    replayCache.assertUnused(payload.jti, now);
  } catch (error) {
    if (error instanceof TideAuthenticationError) throw error;
    throw new TideAuthenticationError("Invalid DPoP proof");
  }
}
