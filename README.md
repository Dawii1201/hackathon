# TideRent

TideRent is a Tide UNLOCKED Challenge 2 prototype for clearer rental bond settlement between a renter and a landlord.

## The problem

Rental bond settlement depends on trust between the renter, landlord, and platform. A changed amount, missing approval, or privileged operator should not silently turn into a release.

## The solution

TideRent records one exact settlement proposal and requires matching approval from both the renter and landlord. The application rejects changed proposal versions, mismatched canonical payloads, duplicate identities, replayed transaction IDs, and administrator-only release attempts. A rejection or dispute places the settlement on HOLD.

The normal release policy has exactly two parties: one renter and one landlord. A third party is not a quorum member and cannot override either party's dispute.

## Demo mode

The current UI uses an in-browser demo client with renter and landlord switching. It is deliberately not authentication. Use the visible **Reset demo state** control in the sidebar to restore the seeded scenarios without restarting the app.

Recommended two-tab flow:

1. Open the renter dashboard and use bond `TR-2048` to create or review a proposal.
2. Approve the exact version as the renter.
3. Open the landlord dashboard, review the same version, and approve it.
4. Request the simulated release and inspect the Security evidence panel.
5. Reset the demo, then use the dispute path to show HOLD and blocked release.

## What is real versus simulated

| Capability | Current status |
| --- | --- |
| Canonical payload and hash checks in the backend service | Real application-side enforcement |
| Renter + landlord quorum and distinct identities | Real application-side enforcement |
| Proposal/version checks and approval reset | Real application-side enforcement |
| Transaction replay protection while current application state is active | Real application-side enforcement |
| Dispute/HOLD behavior and administrator exclusion | Real application-side enforcement |
| API-side JWT/DPoP verifier code | Implemented and unit-tested; live realm configuration is missing |
| TideCloak login and browser DPoP session | Not live in this demo |
| Forseti policy enforcement | Simulated policy adapter |
| Tide authoritative release signature and ORK threshold execution | Not implemented or verified |
| RTBA, CAV, RDRV, and VCAT connections | Not implemented |
| Money transfer | Not implemented |

The policy adapter is intentionally kept behind [lib/bonds/policy.ts](./lib/bonds/policy.ts). The current adapter returns `simulation` evidence only. The repository does not claim a Forseti signature or Tide threshold authorization.

## Threats demonstrated

- Changed amount or proposal version after approval
- Missing approval
- Duplicate or same-party approval
- Administrator bypass attempt
- Replayed transaction ID
- Renter or landlord dispute
- Third-party override attempt

## Tide architecture boundary

The intended integration uses TideCloak for identity, roles, sessions, JWT validation, and browser sender-constrained DPoP requests. Forseti is the future policy boundary for exact payload authorization. The current repository demonstrates the application-side policy and keeps the Forseti result explicitly simulated.

## Legal boundary

This is a hackathon prototype. It does not connect to RTBA, Consumer Affairs Victoria, Rental Dispute Resolution Victoria, VCAT, banks, payment rails, or government systems. No money moves. Official claims and order pathways remain separate.

## Development

```text
npm ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

The server-side API requires a Tide adapter configuration and fails closed with `401` when one is not configured. See [docs/TIDECLOAK_SETUP.md](./docs/TIDECLOAK_SETUP.md) for the external setup boundary.
