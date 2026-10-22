# TideRent API contract

This document defines the backend/frontend boundary for TideRent. It is a contract for the simulated rental bond workflow and does not claim that TideCloak or Forseti is configured in this repository yet.

TideRent is a Victoria-focused prototype. It has no RTBA, Consumer Affairs Victoria, RDRV, VCAT, banking, payment, or money movement integration. Those official pathways remain separate.

The shared TypeScript definitions live in [`shared/api-contracts.ts`](../shared/api-contracts.ts).

## Common rules

- JSON uses camelCase.
- Timestamps are ISO 8601 strings in UTC.
- Monetary values are integer cents. The only supported currency is `AUD`.
- IDs are opaque strings. Clients must not derive meaning from their format.
- Every approval covers the exact `BondReleasePayload` represented by `payloadHash`.
- A changed `bondId`, `recipient`, `amountInCents`, `agreementVersion`, or `transactionId` produces a different payload and invalidates the approval set.
- `transactionId` is one-time use. A second release attempt with the same value must be rejected.
- `authorization.mode: "simulation"` is the only mode available until a real Forseti policy has been deployed and verified end to end. `"forseti"` must never be emitted by a mock or frontend-only check.

## Authentication and authorization

Protected requests use the TideCloak access token:

```http
Authorization: DPoP <access-token>
DPoP: <fresh-proof>
```

The backend is the authoritative enforcement point. It must validate the Tide JWT, issuer, `azp`, expiry, issue time, roles, and DPoP proof when strict DPoP is configured. A client-side role check only controls presentation.

Expected application roles are:

- `renter`: may create proposals for bonds they rent and approve as the renter party.
- `landlord`: may create proposals for bonds they manage and approve as the landlord party.
- `admin`: may inspect operational data and manage support workflows. It cannot substitute for renter and landlord approval or authorize a release by changing storage.

The exact realm roles, client ID, adapter JSON, and DPoP settings must come from the Tide realm owner. They are intentionally not hardcoded here.

## Resources

### `Bond`

Represents the simulated bond record. `status` is the application projection and is not, by itself, release authorization.

### `SettlementProposal`

Represents one exact release request. Its `payloadHash` must be computed server-side from the canonical fields:

```text
bondId | recipient | amountInCents | agreementVersion | transactionId
```

The client may display the hash, but the server constructs and validates the canonical payload.

### `Approval`

Represents a renter or landlord decision over one proposal hash. A normal release requires two approvals with distinct identities and complementary roles.

### `Dispute`

Represents a disagreement. Disputes remain application records and must direct users to the applicable Victorian legal pathways. Opening a dispute must not imply that TideRent replaces RTBA or a formal order process.

### `ReleaseAttempt`

Represents an attempt to finalize a proposal. The backend must reject incomplete quorum, mismatched hashes, reused transaction IDs, duplicate releases, and administrator-only substitution.

## Endpoint contract

These routes are the planned backend contract. They may be implemented incrementally without changing the shapes below.

### `GET /api/bonds/:bondId`

Returns the bond visible to the authenticated renter, landlord, or authorized administrator.

- `200`: `ApiResponse<Bond>`
- `401`: missing or invalid TideCloak authentication
- `403`: authenticated user is not allowed to view the bond
- `404`: bond does not exist or is not visible

### `POST /api/settlement-proposals`

Creates a proposal. The server derives `payloadHash`; clients must not submit a trusted hash as the source of truth.

Request: `CreateSettlementProposalRequest`

Response: `ApiResponse<SettlementProposal>` with `201`.

Possible errors: `400` malformed payload, `401` unauthenticated, `403` party mismatch, `409` conflicting proposal or transaction ID.

### `GET /api/settlement-proposals/:proposalId`

Returns a proposal and its current application-level approval state.

- `200`: `ApiResponse<SettlementProposal>`
- `401`, `403`, `404` as above

### `POST /api/settlement-proposals/:proposalId/approvals`

Records the authenticated renter or landlord decision. The server derives the approver identity and role from the verified token; the client cannot choose either value.

Request: `SubmitApprovalRequest`

The server must compare the submitted `payloadHash` with the current proposal hash and reject mismatches.

Response: `ApiResponse<Approval>` with `201`.

Possible errors: `400` invalid decision, `401`, `403` wrong party or role, `409` duplicate approval or hash mismatch.

### `POST /api/disputes`

Opens a dispute for a bond or proposal.

Request: `OpenDisputeRequest`

Response: `ApiResponse<Dispute>` with `201`.

### `POST /api/release-attempts`

Requests release authorization for a proposal. The server must re-read the authoritative proposal and bond records, reconstruct the canonical payload, and verify the approval quorum before invoking any policy service.

Request: `CreateReleaseAttemptRequest`

Response: `ApiResponse<ReleaseAttempt>` with `201`.

The current implementation may return `authorization.mode: "simulation"`. A future verified integration may return `"forseti"` only after the policy service returns authoritative evidence.

Possible errors: `400` malformed request, `401`, `403`, `409` hash mismatch, incomplete approvals, reused transaction ID, duplicate release, or dispute state.

## Forseti boundary

TideCloak supplies identity, session, token, and role controls. It does not prove that a party approved a particular amount.

The future Forseti policy must bind the exact canonical payload and enforce:

1. distinct renter and landlord approvers;
2. matching payload bytes or hash;
3. valid bond and agreement version;
4. one-time transaction ID and no prior release;
5. valid executor role and doken.

The application must not mint a Forseti signature, treat a database flag as a signature, or expose a release path that bypasses the policy boundary. Custom Forseti deployment is not self-service according to the connected Tide guidance; it requires Tide team review and deployment.

## Error shape

All non-2xx responses should use:

```json
{
  "error": "PAYLOAD_MISMATCH",
  "message": "The approval does not cover the current release payload.",
  "requestId": "opaque-request-id"
}
```

Recommended stable error codes include `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `PAYLOAD_MISMATCH`, `APPROVAL_QUORUM_INCOMPLETE`, `DUPLICATE_APPROVAL`, `TRANSACTION_REPLAY`, `RELEASE_ALREADY_EXISTS`, and `DISPUTE_OPEN`.

## Current implementation status

- Shared TypeScript contracts: defined in `shared/api-contracts.ts`.
- API route implementation: not yet present.
- TideCloak realm and adapter JSON: missing from this workspace.
- TideCloak SDK dependencies: not installed.
- Server-side JWT and DPoP verification: feasible using the retrieved Tide playbooks, but not wired until realm configuration is supplied.
- Forseti bond policy: custom development required; not verified end to end.
