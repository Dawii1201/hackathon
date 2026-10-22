/**
 * TideRent frontend ↔ backend API contract.
 *
 * These interfaces are the coordination point between the frontend (rental UI)
 * and the backend (TideCloak auth, server routes, Forseti). See
 * docs/frontend-api-contract.md for the endpoint table.
 *
 * Contract rules:
 * - Request bodies never carry the caller's role, identity, settlement status,
 *   or release state. The backend derives the actor from the verified
 *   TideCloak token and computes status from its own records.
 * - The frontend never sets a bond to "released". It can only *request* a
 *   release (POST /api/bonds/:id/releases); the backend re-checks the quorum
 *   and policy and decides. Until Forseti is verified end to end, the only
 *   possible outcome is a simulated release attempt.
 * - All money is integer cents (matches `amountInCents` in the canonical
 *   release payload described in PLAN.md).
 */

export type PartyRole = "renter" | "landlord";

/** Settlement states the UI must display. Computed by the backend only. */
export type SettlementStatus = "pending" | "approved" | "disputed";

/**
 * How strongly an approval is enforced. Until a Forseti policy signature is
 * verified end to end, every approval is `"simulated"`.
 */
export type EnforcementLevel = "simulated" | "tide-forseti";

export type DeductionCategory =
  | "cleaning"
  | "damage"
  | "unpaid-rent"
  | "utilities"
  | "keys-and-locks"
  | "other";

export interface Party {
  id: string;
  displayName: string;
  role: PartyRole;
}

export interface Deduction {
  id: string;
  category: DeductionCategory;
  description: string;
  amountCents: number;
  /** Optional free-text evidence reference (e.g. "Exit condition report p.4"). */
  evidenceNote?: string;
}

export interface Approval {
  partyId: string;
  role: PartyRole;
  /** The exact proposal version this approval covers. */
  proposalVersion: number;
  approvedAt: string;
  enforcement: EnforcementLevel;
}

/**
 * One immutable version of the settlement terms. Any change to deductions
 * creates a new version, and approvals for older versions no longer count.
 */
export interface SettlementProposal {
  version: number;
  proposedBy: PartyRole;
  createdAt: string;
  deductions: Deduction[];
  /** bondAmountCents − sum(deductions). Computed by the backend. */
  refundToRenterCents: number;
  /** sum(deductions). Computed by the backend. */
  paymentToLandlordCents: number;
  /**
   * Hash of the canonical release payload, computed server-side only. Absent
   * in the simulator, which has no canonical payload.
   */
  payloadHash?: string;
  note?: string;
}

export type ReleaseAttemptStatus = "simulated" | "verified" | "rejected";

/** Result of asking the backend to release an approved settlement. */
export interface ReleaseAttempt {
  releaseAttemptId: string;
  transactionId: string;
  proposalVersion: number;
  requestedBy: PartyRole;
  status: ReleaseAttemptStatus;
  /** "forseti" only after a real policy signature is verified by the backend. */
  authorizationMode: "simulation" | "forseti";
  createdAt: string;
  rejectionReason?: string;
}

export interface Dispute {
  raisedBy: PartyRole;
  raisedAt: string;
  reason: string;
  /** Pathway the party says they intend to use. Informational only. */
  intendedPathway: DisputePathway;
}

export type DisputePathway = "negotiate" | "cav-advice" | "rdrv" | "vcat" | "undecided";

export type TimelineEventType =
  | "request-created"
  | "proposal-revised"
  | "approval-recorded"
  | "approvals-reset"
  | "settlement-approved"
  | "dispute-raised"
  | "release-requested";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  actorRole: PartyRole | "system";
  at: string;
  summary: string;
}

export interface Bond {
  id: string;
  /** RTBA bond number as entered by the parties. Not verified against RTBA. */
  rtbaReference: string;
  propertyAddress: string;
  bondAmountCents: number;
  tenancyEndDate: string;
  renter: Party;
  landlord: Party;
}

/** A bond plus its settlement case, as returned to an authenticated party. */
export interface BondCase {
  bond: Bond;
  /** null when no refund request has been made yet. */
  settlement: SettlementCase | null;
}

export interface SettlementCase {
  /** Unique, one-time transaction identifier for the eventual release payload. */
  transactionId: string;
  status: SettlementStatus;
  currentProposal: SettlementProposal;
  /** Approvals for `currentProposal.version` only. */
  approvals: Approval[];
  dispute: Dispute | null;
  /** Latest release attempt, if one was requested. */
  release: ReleaseAttempt | null;
  timeline: TimelineEvent[];
}

/** Lightweight row for dashboards. */
export interface BondSummary {
  bondId: string;
  propertyAddress: string;
  bondAmountCents: number;
  counterpartyName: string;
  status: SettlementStatus | "no-request";
  refundToRenterCents: number | null;
  /** True when the caller still needs to act on the current version. */
  awaitingMyApproval: boolean;
  updatedAt: string;
}

// ---- Request bodies (no role/status/identity fields by design) ----

export interface DeductionInput {
  category: DeductionCategory;
  description: string;
  amountCents: number;
  evidenceNote?: string;
}

/** Body of POST /api/bonds/:id/proposals. */
export interface ProposeTermsInput {
  /**
   * The version the caller was looking at, or null to open the first
   * proposal (the refund request). The backend rejects stale edits.
   */
  basedOnVersion: number | null;
  /** Empty means a full refund to the renter. */
  deductions: DeductionInput[];
  note?: string;
}

/** Body of POST /api/bonds/:id/approvals. */
export interface ApproveInput {
  /** Must equal the current version, or the backend rejects the approval. */
  proposalVersion: number;
  /** Echo of the server's payloadHash when present; backend rejects mismatches. */
  payloadHash?: string;
}

/** Body of POST /api/bonds/:id/releases. */
export interface RequestReleaseInput {
  proposalVersion: number;
  payloadHash?: string;
}

export interface RaiseDisputeInput {
  reason: string;
  intendedPathway: DisputePathway;
}

export interface ApiError {
  code:
    | "unauthenticated"
    | "forbidden"
    | "not-found"
    | "stale-version"
    | "invalid-input"
    | "invalid-state";
  message: string;
}

export class BondApiError extends Error {
  constructor(public readonly error: ApiError) {
    super(error.message);
    this.name = "BondApiError";
  }
}

/** The operations the UI needs. Implemented by the mock and HTTP clients. */
export interface BondApi {
  /** Whether results come from the in-browser simulator. */
  readonly mode: "mock" | "http";
  listMyBonds(): Promise<BondSummary[]>;
  getBondCase(bondId: string): Promise<BondCase>;
  proposeTerms(bondId: string, input: ProposeTermsInput): Promise<BondCase>;
  approve(bondId: string, input: ApproveInput): Promise<BondCase>;
  raiseDispute(bondId: string, input: RaiseDisputeInput): Promise<BondCase>;
  requestRelease(bondId: string, input: RequestReleaseInput): Promise<BondCase>;
}
