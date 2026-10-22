# Frontend ↔ backend API contract

Status: **endpoints agreed between frontend and backend.** Shapes used by the UI live in
[`lib/api/types.ts`](../lib/api/types.ts). The backend's own contract is [`docs/API_CONTRACT.md`](API_CONTRACT.md) /
`shared/api-contracts.ts`. Where the response shapes differ, [`lib/api/http-client.ts`](../lib/api/http-client.ts) is the single
place that adapts them. The UI currently runs against an in-browser simulator
([`lib/api/mock-client.ts`](../lib/api/mock-client.ts)), which is not a security boundary.

## Endpoints

All are under `/api` and need an authenticated party on the bond (TideCloak token + DPoP, attached by the injected fetch).
A party who isn't on the bond gets `404`, so the endpoint doesn't reveal that the bond exists.

| Method | Endpoint | Purpose | UI method |
| --- | --- | --- | --- |
| GET | `/api/bonds` | List the caller's bonds | `listMyBonds()` |
| GET | `/api/bonds/:id` | Bond + settlement case | `getBondCase()` |
| POST | `/api/bonds/:id/proposals` | Create a proposal (`basedOnVersion: null` = the renter's first refund request) | `proposeTerms()` |
| POST | `/api/bonds/:id/approvals` | Approve the current proposal | `approve()` |
| POST | `/api/bonds/:id/disputes` | Open a dispute | `raiseDispute()` |
| POST | `/api/bonds/:id/releases` | Request a release through the policy check (simulated until Forseti is verified) | `requestRelease()` |

## Principles

1. **The backend decides who is acting.** Request bodies never include a role, user ID, status or release flag. The actor comes from the verified TideCloak token.
2. **The backend computes status.** The UI only renders `pending`, `approved` and `disputed`.
3. **Approvals are bound to exact terms.** `approvals` and `releases` send `proposalVersion` and, when the server provides one, its `payloadHash`. The backend rejects anything that isn't the current version or hash. Any new proposal clears earlier approvals.
4. **The frontend can only *request* a release.** The backend re-reads the records, rebuilds the canonical payload, checks distinct renter + landlord approvals and the one-time `transactionId`, and then decides.
5. **Enforcement is reported honestly.** `Approval.enforcement` is `"simulated"` and `ReleaseAttempt.authorizationMode` is `"simulation"` until a Forseti signature is verified end to end. Only then may the backend return `"tide-forseti"` / `"forseti"`.
6. **Money is integer cents (AUD).**

## Responses and errors

- Success: either the object itself or `{ "data": <object> }`. The HTTP client accepts both.
- Errors: `{ "error": "<CODE>", "message": "..." }`. The client maps backend codes to UI codes:

| Backend `error` | UI code |
| --- | --- |
| `UNAUTHORIZED` | `unauthenticated` |
| `FORBIDDEN` | `forbidden` |
| `NOT_FOUND` | `not-found` |
| `PAYLOAD_MISMATCH`, `STALE_VERSION` | `stale-version` |
| `INVALID_INPUT` | `invalid-input` |
| `APPROVAL_QUORUM_INCOMPLETE`, `DUPLICATE_APPROVAL`, `TRANSACTION_REPLAY`, `RELEASE_ALREADY_EXISTS`, `DISPUTE_OPEN` | `invalid-state` |

Unknown codes fall back to the HTTP status.

## State rules the simulator follows (please confirm)

- Only the renter can open the first proposal (`basedOnVersion: null`). Either party can propose new versions after that.
- Status is `approved` once distinct renter and landlord approvals both exist for the current version.
- A new proposal sets status to `pending`, bumps `version` and clears approvals. An open dispute is cleared but stays in the timeline.
- A dispute can be raised from `pending` only. You can't approve while disputed.
- A release can be requested only when `approved`, for the current version, with a complete quorum, and once per `transactionId`.
- The sum of deductions must not exceed the bond, and every deduction amount must be greater than 0.

## Still to agree with the backend

- **Split payouts:** `BondReleasePayload` has a single `recipient` and `amountInCents`, but a settlement usually pays the renter part of the bond and the landlord the rest. Either use one payload per recipient or a list of `{ recipient, amountInCents }`.
- **Deductions:** the UI needs a deduction list (`category`, `description`, `amountCents`, `evidenceNote`) on each proposal.
- **`proposerId` in `CreateSettlementProposalRequest`:** the identity must come from the token, so the backend should ignore this field or remove it.

## Wiring the real backend

`lib/api/index.ts` returns the simulator today. To switch, return `createHttpBondApi(authenticatedFetch)` from
`lib/api/http-client.ts`, where `authenticatedFetch` is the fetch wrapper from the TideCloak integration.
