# TideRent implementation plan

## Scope and security boundary

TideRent is a Victoria-focused rental bond settlement prototype. It does not connect to RTBA, Consumer Affairs Victoria, RDRV, VCAT, banks, or payment rails, and it must not imply that it replaces any lawful renter-initiated RTBA claim or order pathway.

The simulated ledger will treat a release as a signed statement over this exact canonical payload:

```text
bondId | recipient | amountInCents | agreementVersion | transactionId
```

A normal mutual settlement needs distinct renter and landlord approvals over the same payload. Any change to the amount, recipient, bond ID, agreement version, or transaction ID must invalidate the evidence. Replays and duplicate releases must be rejected. An administrator must not be able to manufacture a release by changing a database row or bypassing the approval quorum.

## What TideCloak protects

TideCloak provides identity and session controls: OIDC login, token issuance, claims and roles, refresh/session handling, and server-side token verification. With DPoP enabled and verified on every protected request, the access token is sender-constrained to the browser key that authenticated. This protects the identity boundary and authenticated API access. It does not, by itself, prove that a renter or landlord approved a particular amount, prevent a trusted backend from changing a row, or enforce a two-party bond release rule.

## What requires a custom Forseti policy

The release operation needs a policy-governed cryptographic authorization. A future Forseti contract should validate:

1. The canonical bond release payload, including the exact amount and unique transaction ID.
2. Two distinct approvers with the renter and landlord roles, with no self-approval or duplicate identity.
3. The agreement version and bond ID against the authoritative settlement record.
4. A one-time transaction identifier and the absence of a prior release.
5. The executor's valid TideCloak delegated token and permitted role.

Only after the policy succeeds should the application receive an authoritative signature that it can store beside the immutable release evidence. Until this is implemented and tested against a Tide environment, any database or frontend approval in this repository is simulation only.

## Threat model

| Threat | Impact | MVP treatment |
| --- | --- | --- |
| Renter or landlord changes the amount after approving | Wrong release | Canonical payload hash; both approvals must cover identical bytes |
| Missing, duplicated, or same-party approvals | Unauthorised mutual settlement | Require distinct renter and landlord approvals; reject incomplete quorum |
| Replay or duplicate release | Double payment/release record | Unique transaction ID and one-time release state |
| Compromised application administrator | Bypass of business rules | Keep admin out of signing authority; move release authorization into Forseti |
| Stolen bearer token | Account misuse | TideCloak verification plus DPoP on protected API requests |
| XSS or browser compromise | Acting as the signed-in user | CSP, input validation, short sessions, DPoP; acknowledge browser boundary |
| Legal/process confusion | User relies on prototype as official process | Clear UI language: no government integration, no money movement, RTBA rights remain separate |
| Evidence tampering | Disputed audit trail | Append-only evidence model, hashes, actor identity, timestamps, and server-side validation |

## Technical architecture

- **Next.js + TypeScript + Tailwind CSS:** public marketing surface and later role-based workflows.
- **TideCloak:** authentication, role claims, protected route/API verification, and DPoP sender constraint when configured.
- **Next.js server routes:** validate requests, construct canonical payloads, call the policy service, and persist only verified evidence.
- **SQLite:** MVP projection of bonds, proposals, approvals, release attempts, and audit events. SQLite is storage, not authorization.
- **Forseti:** future policy boundary for the release signature. The backend is a request terminal and cannot mint a valid release signature itself.
- **No integrations:** official RTBA/CAV/RDRV/VCAT and banking workflows remain out of scope for this prototype.

## Incremental implementation

### Step 1 — Initial scaffold and homepage

- Add a minimal Next.js App Router application with TypeScript and Tailwind.
- Build a responsive TideRent homepage that explains the problem, the mutual-settlement model, the security boundary, and the legal boundary.
- Add no fake login, fake government integration, or fake cryptographic approval.

**Acceptance tests**

- `npm run build` completes successfully.
- Homepage renders at `/` with mobile-friendly layout and clear simulation disclaimers.
- No secrets, private keys, or government/API claims are present.

### Step 2 — TideCloak development authentication

- Configure a local TideCloak realm and client using environment variables.
- Add login/logout, role claims, protected dashboard routes, server-side JWT verification, and DPoP verification where supported.

**Acceptance tests**

- Unauthenticated users cannot access protected routes.
- A token with the wrong role receives 403.
- A copied token without a valid DPoP proof is rejected when strict DPoP is enabled.

### Step 3 — Simulated bond workflow

- Add SQLite schema and server-side canonicalization for release payloads.
- Implement proposal, review, approval, dispute, and release-attempt states.
- Demonstrate modified amount, missing approval, duplicate release, and compromised-admin attempts as rejected test cases.

**Acceptance tests**

- A changed amount produces a different payload hash and cannot release.
- One approval cannot release.
- The same transaction ID cannot release twice.
- An admin-only request cannot substitute for both parties.

### Step 4 — Forseti feasibility spike

- Confirm access to a Tide environment and the required SDK versions.
- Implement a minimal `Policy:1` request for the canonical release payload.
- Keep a feature flag that labels the workflow as simulated until a real policy signature is verified end to end.

**Acceptance tests**

- The policy rejects changed payload bytes, invalid roles, duplicate approvers, expired tokens, and reused transaction IDs.
- A valid renter + landlord quorum produces a verifiable authoritative artefact.

### Step 5 — Demo hardening

- Add security event views, evidence export, CSP/security headers, rate limits, and meaningful integration tests.
- Prepare a demo script that separates Tide-protected steps from simulated steps and states the legal boundary.

## Sources consulted

- TideCloak introduction: https://docs.tide.org/
- Forseti programmable policy engine: https://docs.tide.org/Core-Concepts/forseti-engine
- DPoP sender-constrained tokens: https://docs.tide.org/Core-Concepts/dpop
- TideCloak Next.js guidance: https://docs.tide.org/Languages/NextJS/tidecloak-nextjs-intro
- Tide AI agent pack / security gap guidance: https://docs.tide.org/ai-agent-pack
- Challenge brief supplied in the project request: https://tide.org/unlocked/#challenge
