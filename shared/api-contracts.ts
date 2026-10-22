/**
 * Shared TideRent API contracts.
 *
 * These types describe the backend/frontend boundary. They do not represent
 * Tide or Forseti enforcement until a real environment verifies the flow.
 */

export type IsoDateTime = string;
export type CurrencyCode = "AUD";

export type PartyRole = "renter" | "landlord";
export type ActorRole = PartyRole | "admin";

export type BondStatus = "active" | "settling" | "disputed" | "released";
export type ProposalStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "disputed"
  | "released"
  | "rejected";
export type ApprovalDecision = "approved" | "rejected";
export type DisputeStatus = "open" | "resolved" | "withdrawn";
export type ReleaseAttemptStatus =
  | "pending"
  | "rejected"
  | "simulated"
  | "verified";

/** The exact fields covered by every settlement approval. */
export interface BondReleasePayload {
  bondId: string;
  recipient: string;
  amountInCents: number;
  agreementVersion: string;
  transactionId: string;
}

export interface Bond {
  bondId: string;
  renterId: string;
  landlordId: string;
  amountInCents: number;
  currency: CurrencyCode;
  agreementVersion: string;
  status: BondStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface SettlementProposal extends BondReleasePayload {
  proposalId: string;
  bondId: string;
  proposerId: string;
  payloadHash: string;
  status: ProposalStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Approval {
  approvalId: string;
  proposalId: string;
  approverId: string;
  approverRole: PartyRole;
  decision: ApprovalDecision;
  payloadHash: string;
  createdAt: IsoDateTime;
}

export interface Dispute {
  disputeId: string;
  bondId: string;
  proposalId?: string;
  openedBy: string;
  reason: string;
  status: DisputeStatus;
  createdAt: IsoDateTime;
  resolvedAt?: IsoDateTime;
}

export interface ReleaseAuthorizationEvidence {
  mode: "simulation" | "forseti";
  signature?: string;
  policyId?: string;
  verifiedAt?: IsoDateTime;
}

export interface ReleaseAttempt {
  releaseAttemptId: string;
  bondId: string;
  proposalId: string;
  transactionId: string;
  payloadHash: string;
  requestedBy: string;
  status: ReleaseAttemptStatus;
  authorization?: ReleaseAuthorizationEvidence;
  rejectionReason?: string;
  createdAt: IsoDateTime;
}

export interface CreateSettlementProposalRequest
  extends BondReleasePayload {
  proposerId: string;
}

export interface SubmitApprovalRequest {
  proposalId: string;
  decision: ApprovalDecision;
  payloadHash: string;
}

export interface OpenDisputeRequest {
  bondId: string;
  proposalId?: string;
  reason: string;
}

export interface CreateReleaseAttemptRequest {
  proposalId: string;
  transactionId: string;
  payloadHash: string;
}

export interface ApiError {
  error: string;
  message: string;
  requestId?: string;
  details?: Record<string, string>;
}

export interface ApiResponse<T> {
  data: T;
  requestId?: string;
}
