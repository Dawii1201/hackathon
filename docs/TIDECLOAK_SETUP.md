# TideCloak setup for TideRent

The connected Tide Raziel playbooks report that no local TideCloak server or credentials are available in this workspace. Docker is not installed, no Tide environment variables are set, and no `data/tidecloak.json` adapter has been exported.

These steps require user interaction. Do not invent the licence email, accept Tide terms on the user’s behalf, or put a password in a script.

## Required user decisions

Before creating or licensing a realm, the realm owner must provide:

1. The real email address that should manage the Tide licence.
2. Explicit agreement to [Tide’s Terms & Conditions](https://tide.org/legal).
3. The hosting choice: local Docker or hosted Skycloak.

## Local development requirements

The official playbook requires Docker, port `8080`, the `tideorg/tidecloak-dev:latest` image, and a project-local `data/` directory. The bootstrap password must come from an uncommitted `.env` file.

Do not append `start-dev` to the Tide image or override its ORK, threshold, or payer defaults. The image imports its own `myrealm`; TideRent should use another realm name.

## Realm and client requirements

Use the canonical Tide realm template and replace its placeholders with:

- `REALM_NAME`, for example `tiderent`;
- `CLIENT_NAME`, for example `tiderent-web`;
- `CLIENT_APP_URL`, for local development `http://localhost:3000`.

The realm setup sequence is:

1. Start TideCloak.
2. Import the full realm template.
3. Call `setUpTideRealm` with the user-provided licence email as form data.
4. Enable IGA in Tide mode (`iga.attestor=tide`).
5. Approve and commit initial change requests.
6. Configure the client’s redirect, logout, and web-origin URLs.
7. Create standard application roles `renter`, `landlord`, and `admin`.
8. Assign `renter` or `landlord` through the governed IGA flow.
9. Export the adapter with:

   ```text
   GET /admin/realms/{realm}/vendorResources/get-installations-provider?clientId={client-uuid}&providerId=keycloak-oidc-keycloak-json
   ```

10. Store the adapter outside Git at `data/tidecloak.json`, or provide it through `CLIENT_ADAPTER`/`TIDECLOAK_CONFIG_B64`.

The adapter must include `realm`, `auth-server-url`, `resource`, and embedded `jwk.keys`. The backend refuses remote JWKS fallback.

## Next.js integration boundary

The official existing-app playbook uses `@tidecloak/nextjs` and a `TideCloakProvider` with strict DPoP configuration:

```text
useDPoP: { mode: "strict", alg: "ES256" }
```

The browser provider, login/logout controls, redirect handler, silent SSO page, and CSP changes belong in the frontend integration. They are not wired here because those files are owned by the teammate on `feature/rental-ui`.

The backend implementation in `lib/auth/` provides local embedded-JWK JWT verification, issuer/`azp`/expiry checks, role extraction, strict DPoP proof validation, and renter/landlord/admin guards.

## Verification status

The backend verifier and tests use generated local keys. They are not proof of a live Tide realm until a real adapter, TideCloak tokens, DPoP-bound requests, and role assignments are exercised end to end.
