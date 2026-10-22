# Frontend ↔ backend API contract (draft)

Status: **draft for review by the backend developer.** The source of truth for the shapes is
[`lib/api/types.ts`](../lib/api/types.ts). The frontend currently runs against an in-browser simulator
([`lib/api/mock-client.ts`](../lib/api/mock-client.ts)). That simulator is not a security boundary.

## Principles

1. **The backend decides who is acting.** Request bodies never include a role, user ID, status or release flag. The actor comes from the verified TideCloak access token (with DPoP where enabled).
2. **The backend computes status.** `pending`, `approved` and `disputed` are derived server-side. The UI only renders them.
3. **Approvals are bound to a version.** `POST /approvals` carries `proposalVersion`. The backend rejects anything that isn't the current version (`stale-version`). Any new proposal clears earlier approvals.
4. **"Approved" ≠ "released".** The frontend has no release endpoint. Release authorisation (the canonical payload + Forseti policy in PLAN.md) stays backend-only.
5. **Enforcement is reported honestly.** Each `Approval.enforcement` is `"simulated"` until a Forseti signature is verified end to end. After that it becomes `"tide-forseti"`, and the UI changes its labels to match.
6. **Money is integer cents.**

## Endpoints

All are under `/api` and need an authenticated party (renter or landlord) on the bond. A party who isn't on the bond gets `404 not-found`, so the endpoint doesn't reveal that the bond exists.

| Method & path | Body | Returns | Who |
| --- | --- | --- | --- |
| `GET /bonds` | — | `BondSummary[]` | renter, landlord |
| `GET /bonds/:bondId` | — | `BondCase` | parties on the bond |
| `POST /bonds/:bondId/refund-request` | `CreateRefundRequestInput` | `BondCase` | renter only; only when no settlement exists |
| `POST /bonds/:bondId/proposals` | `ProposeTermsInput` | `BondCase` | either party; not after `approved` |
| `POST /bonds/:bondId/approvals` | `ApproveInput` | `BondCase` | either party; once per version; not while `disputed` |
| `POST /bonds/:bondId/disputes` | `RaiseDisputeInput` | `BondCase` | either party; not after `approved` |

Errors use the `ApiError` JSON body `{ code, message }` with these codes: `unauthenticated` (401), `forbidden` (403), `not-found` (404), `stale-version` (409), `invalid-state` (409) and `invalid-input` (400).

## State rules the simulator follows (please confirm)

- Status is `approved` once distinct renter and landlord approvals both exist for the current version.
- A new proposal sets status to `pending`, bumps `version` and clears approvals. If a dispute was open, it is cleared, but it stays in the timeline.
- A dispute can be raised from `pending` only.
- The sum of deductions must not exceed the bond. Every deduction amount must be > 0.

## Wiring the real backend

`lib/api/index.ts` returns the simulator today. To switch, return
`createHttpBondApi(authenticatedFetch)` from `lib/api/http-client.ts`. `authenticatedFetch` should be the
fetch wrapper supplied by the TideCloak integration, which attaches the token and DPoP proof. The frontend code
doesn't call TideCloak itself.
