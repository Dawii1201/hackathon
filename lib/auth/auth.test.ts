import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { calculateJwkThumbprint, exportJWK, generateKeyPair, SignJWT } from "jose";
import { authenticateRequest, requireRole, TideAuthorizationError } from "./guards";
import { DpopReplayCache, verifyDpopProof } from "./dpop";
import { hasTideRole, TideAuthenticationError, verifyTideAccessToken } from "./tide-jwt";
import type { TideAdapterConfig } from "./tide-config";

const issuer = "https://tide.example/realms/tiderent";

async function fixture() {
  const { privateKey, publicKey } = await generateKeyPair("EdDSA");
  const publicJwk = await exportJWK(publicKey);
  const config: TideAdapterConfig = {
    realm: "tiderent",
    "auth-server-url": "https://tide.example",
    resource: "tiderent-web",
    jwk: { keys: [publicJwk] },
  };
  const jkt = await calculateJwkThumbprint(publicJwk, "sha256");
  const token = async (role: string, exp: number) => new SignJWT({
    realm_access: { roles: [role] },
    cnf: { jkt },
    azp: "tiderent-web",
  })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(privateKey);
  return { config, token, privateKey, publicJwk };
}

test("rejects an invalid JWT", async () => {
  const { config } = await fixture();
  await assert.rejects(verifyTideAccessToken("not-a-jwt", config), TideAuthenticationError);
});

test("rejects an expired JWT", async () => {
  const { config, token } = await fixture();
  await assert.rejects(
    verifyTideAccessToken(await token("renter", Math.floor(Date.now() / 1000) - 1), config),
    TideAuthenticationError,
  );
});

test("rejects a wrong role", async () => {
  const { config, token } = await fixture();
  const claims = await verifyTideAccessToken(await token("landlord", Math.floor(Date.now() / 1000) + 60), config);
  assert.equal(hasTideRole(claims, "renter"), false);
});

test("requires DPoP for protected requests", async () => {
  const { config, token } = await fixture();
  const accessToken = await token("renter", Math.floor(Date.now() / 1000) + 60);
  await assert.rejects(
    authenticateRequest(
      {
        method: "GET",
        url: "https://app.example/api/bonds/TR-1",
        headers: new Headers({ Authorization: `Bearer ${accessToken}` }),
      },
      { config },
    ),
    TideAuthenticationError,
  );
});

test("rejects a DPoP proof signed by the wrong key", async () => {
  const { config, token } = await fixture();
  const accessToken = await token("renter", Math.floor(Date.now() / 1000) + 60);
  const { privateKey, publicKey } = await generateKeyPair("EdDSA");
  const now = Math.floor(Date.now() / 1000);
  const proof = await new SignJWT({
    jti: "wrong-key",
    htm: "GET",
    htu: "https://app.example/api/bonds/TR-1",
    iat: now,
    ath: createHash("sha256").update(accessToken).digest("base64url"),
  })
    .setProtectedHeader({ alg: "EdDSA", typ: "dpop+jwt", jwk: await exportJWK(publicKey) })
    .sign(privateKey);
  const claims = await verifyTideAccessToken(accessToken, config);
  await assert.rejects(
    verifyDpopProof(
      accessToken,
      claims,
      { method: "GET", url: "https://app.example/api/bonds/TR-1", headers: new Headers({ DPoP: proof }), now },
      new DpopReplayCache(),
    ),
    TideAuthenticationError,
  );
});

test("role guard rejects a landlord token on a renter route", async () => {
  const { config, token } = await fixture();
  const accessToken = await token("landlord", Math.floor(Date.now() / 1000) + 60);
  await assert.rejects(
    requireRole(
      {
        method: "GET",
        url: "https://app.example/api/bonds/TR-1",
        headers: new Headers({ Authorization: `Bearer ${accessToken}` }),
      },
      "renter",
      { config, requireDpop: false },
    ),
    TideAuthorizationError,
  );
});

test("rejects a tampered token", async () => {
  const { config, token } = await fixture();
  const validToken = await token("renter", Math.floor(Date.now() / 1000) + 60);
  await assert.rejects(verifyTideAccessToken(`${validToken}tampered`, config), TideAuthenticationError);
});

test("rejects an administrator impersonating a rental party", async () => {
  const { config, token } = await fixture();
  const adminToken = await token("admin", Math.floor(Date.now() / 1000) + 60);
  await assert.rejects(
    requireRole(
      {
        method: "POST",
        url: "https://app.example/api/release-attempts",
        headers: new Headers({ Authorization: `Bearer ${adminToken}` }),
      },
      "renter",
      { config, requireDpop: false },
    ),
    TideAuthorizationError,
  );
});

test("rejects a replayed DPoP jti", async () => {
  const { config, token, privateKey, publicJwk } = await fixture();
  const accessToken = await token("renter", Math.floor(Date.now() / 1000) + 60);
  const now = Math.floor(Date.now() / 1000);
  const proof = await new SignJWT({
    jti: "replayed-proof",
    htm: "GET",
    htu: "https://app.example/api/bonds/TR-1",
    iat: now,
    ath: createHash("sha256").update(accessToken).digest("base64url"),
  })
    .setProtectedHeader({ alg: "EdDSA", typ: "dpop+jwt", jwk: publicJwk })
    .sign(privateKey);
  const claims = await verifyTideAccessToken(accessToken, config);
  const request = {
    method: "GET",
    url: "https://app.example/api/bonds/TR-1",
    headers: new Headers({ DPoP: proof }),
    now,
  };
  const replayCache = new DpopReplayCache();
  await verifyDpopProof(accessToken, claims, request, replayCache);
  await assert.rejects(verifyDpopProof(accessToken, claims, request, replayCache), TideAuthenticationError);
});
