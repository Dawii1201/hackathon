# Settle

**A fairer way to agree what happens next.**

## The problem

Rental bond settlement depends on trust between a renter and landlord. A unilateral release, altered amount, or privileged administrator should not be enough to finalize an agreement. If either party rejects the proposal, the settlement should move to hold and follow a dispute path.

## How Settle works

Settle records one settlement proposal for both parties to review.

- The renter and landlord review the same proposal version.
- Both must approve the exact same canonical payload.
- Normal release requires one renter approval and one landlord approval.
- The approving identities must be distinct.
- A rejection creates a dispute and places the settlement on **HOLD**.
- A disputed settlement cannot be released.
- A third party is not part of the normal release quorum.
- Third-party approval cannot override a renter or landlord dispute.

## Security model

The current application-side policy enforces:

- Canonical payload validation for bond, recipient, amount, agreement version, and transaction ID.
- Proposal and version matching, with earlier approvals reset when terms change.
- Renter + landlord quorum with distinct identities.
- Administrator exclusion from party approval and release.
- Replay and duplicate transaction protection while the current application state is active.
- Dispute and HOLD blocking before release.
- Server-side JWT and DPoP verifier code with tests for invalid, expired, wrong-role, tampered, and replayed proofs.

The browser demo is intentionally not authentication. The UI's renter and landlord switching is for demonstration only.

## What is real vs simulated

| Capability | Status |
| --- | --- |
| Application-side settlement policy | **Real / implemented** |
| Canonical payload and proposal/version checks | **Real / implemented** |
| Renter + landlord quorum and distinct identities | **Real / implemented** |
| Dispute / HOLD logic and administrator exclusion | **Real / implemented** |
| Replay checks during active application state | **Real / implemented** |
| Server-side JWT / DPoP verifier code and tests | **Implemented and tested; live realm not configured** |
| Live TideCloak login | **Simulated / not live** |
| Live browser DPoP key flow | **Simulated / not live** |
| Forseti execution | **Simulated policy adapter** |
| Authoritative Tide/Forseti threshold release signature | **Not implemented or verified** |
| ORK threshold execution for bond release | **Not implemented or verified** |
| RTBA integration | **Not implemented** |
| CAV, RDRV, or VCAT integration | **Not implemented** |
| Real money transfer | **Not implemented** |
| Durable production persistence | **Not implemented; demo state is in memory** |

The current policy adapter is [lib/bonds/policy.ts](./lib/bonds/policy.ts). It returns simulation evidence only. Settle does not claim live Tide authorization, a Forseti signature, government verification, or a completed bond transfer.

## Demo

Use the existing demo controls:

1. Open **Renter demo** and select bond `TR-2048`.
2. Review the proposal and approve it.
3. Open **Landlord demo** and approve the same proposal version.
4. Request the simulated release.
5. Inspect the **Security Evidence** panel.
6. Use **Reset demo state** to restore the seeded scenarios.
7. Reject a proposal with **Reject and place on hold** and show that release is blocked.

The demo uses an in-browser mock client and does not create fake authentication.

## Security Evidence panel

For each settlement, the panel shows:

- Bond ID
- Agreement version
- Transaction ID
- Renter approval
- Landlord approval
- Dispute / HOLD status
- Release status
- Refund amount
- Canonical payload fields
- `SIMULATED_FORSETI` policy mode

It does not display tokens, secrets, or private keys.

## Threats demonstrated

- Changed amount after approval
- Missing approval
- Duplicate identity
- Administrator bypass attempt
- Replayed transaction
- Dispute override attempt

## Tech stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- `jose` for JWT and DPoP verification
- `@tidecloak/nextjs` server verification dependency
- Node test runner through `tsx`
- Server routes under `app/api/bonds`
- Shared contracts under `shared/`
- Current demo state in an in-memory mock client and service

## Local setup

```bash
npm ci
npm run dev
```

The browser demo can run without external credentials. The protected server API requires a Tide adapter configuration and fails closed when one is not configured.

## Validation

```bash
npm run typecheck
npm test
npm run build
```

The current test suite contains **23 passing tests** covering authentication helpers, DPoP validation, settlement quorum, rejection and HOLD behavior, replay protection, administrator exclusion, and third-party override attempts.

## Legal / prototype boundary

Settle is a hackathon prototype. No money moves and no RTBA, Consumer Affairs Victoria, Rental Dispute Resolution Victoria, or VCAT integration exists. Official bond handling and any formal dispute or order pathway remain outside Settle.
