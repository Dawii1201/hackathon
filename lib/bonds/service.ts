import { createHash, randomUUID } from "node:crypto";
import type {
  Approval,
  Bond,
  BondCase,
  BondSummary,
  Deduction,
  DeductionInput,
  PartyRole,
  ApprovalDecision,
  ProposeTermsInput,
  RaiseDisputeInput,
  RequestReleaseInput,
  SettlementCase,
  SettlementProposal,
  TimelineEvent,
} from "../api/types";
import { bondReleasePolicy, type BondReleasePolicyAdapter } from "./policy";

export type BondActor = { id: string; role: PartyRole | "admin" };

export type BondErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "STALE_VERSION"
  | "PAYLOAD_MISMATCH"
  | "APPROVAL_QUORUM_INCOMPLETE"
  | "DUPLICATE_APPROVAL"
  | "TRANSACTION_REPLAY"
  | "RELEASE_ALREADY_EXISTS"
  | "DISPUTE_OPEN";

export class BondServiceError extends Error {
  constructor(public readonly code: BondErrorCode, message: string) {
    super(message);
    this.name = "BondServiceError";
  }
}

type StoredCase = BondCase & {
  canonical: {
    agreementVersion: string;
    recipient: string;
    amountInCents: number;
    payloadHash: string;
  } | null;
};

const renter = { id: "renter-jordan", displayName: "Jordan Lee", role: "renter" as const };
const landlord = { id: "landlord-priya", displayName: "Priya Shah", role: "landlord" as const };

const now = () => new Date().toISOString();
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function canonicalString(input: {
  bondId: string;
  recipient: string;
  amountInCents: number;
  agreementVersion: string;
  transactionId: string;
}): string {
  return [
    input.bondId,
    input.recipient,
    input.amountInCents,
    input.agreementVersion,
    input.transactionId,
  ].join("|");
}

export function hashBondReleasePayload(input: {
  bondId: string;
  recipient: string;
  amountInCents: number;
  agreementVersion: string;
  transactionId: string;
}): string {
  return createHash("sha256").update(canonicalString(input), "utf8").digest("hex");
}

function bond(id: string, propertyAddress: string, amountCents: number, renterParty = renter): Bond {
  return {
    id,
    rtbaReference: `SIM-${id}`,
    propertyAddress,
    bondAmountCents: amountCents,
    tenancyEndDate: "2026-10-20",
    renter: renterParty,
    landlord,
  };
}

function emptyCase(record: Bond, transactionId: string): StoredCase {
  return { bond: record, settlement: null, canonical: null };
}

function initialStore(): StoredCase[] {
  return [
    emptyCase(bond("TR-2048", "12 Example Street, Brunswick VIC", 230000), "TX-2048"),
    emptyCase(bond("TR-1975", "4/88 Sample Road, Fitzroy VIC", 180000), "TX-1975"),
    emptyCase(bond("TR-2101", "7 Demo Lane, Carlton VIC", 260000), "TX-2101"),
    emptyCase(bond("TR-2190", "3/15 Mock Parade, Northcote VIC", 195000), "TX-2190"),
  ];
}

let cases = initialStore();
const usedTransactionIds = new Set<string>();

export function resetBondStore(): void {
  cases = initialStore();
  usedTransactionIds.clear();
}

function fail(code: BondErrorCode, message: string): never {
  throw new BondServiceError(code, message);
}

function findCase(bondId: string): StoredCase {
  return cases.find((entry) => entry.bond.id === bondId) ?? fail("NOT_FOUND", "Bond not found.");
}

function canView(entry: StoredCase, actor: BondActor): boolean {
  return actor.role === "admin" || entry.bond[actor.role].id === actor.id;
}

function ownCase(bondId: string, actor: BondActor): StoredCase {
  const entry = findCase(bondId);
  if (!canView(entry, actor)) fail("NOT_FOUND", "Bond not found.");
  return entry;
}

function requireParty(actor: BondActor): asserts actor is BondActor & { role: PartyRole } {
  if (actor.role !== "renter" && actor.role !== "landlord") {
    fail("FORBIDDEN", "Only renter or landlord identities can act on settlement terms.");
  }
}

function event(settlement: SettlementCase, type: TimelineEvent["type"], actorRole: TimelineEvent["actorRole"], summary: string): void {
  settlement.timeline.push({ id: randomUUID(), type, actorRole, at: now(), summary });
}

function validateDeductions(bondRecord: Bond, inputs: DeductionInput[]): Deduction[] {
  if (!Array.isArray(inputs)) fail("INVALID_INPUT", "Deductions must be an array.");
  const deductions = inputs.map((input) => {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      fail("INVALID_INPUT", "Each deduction must be a positive integer amount.");
    }
    if (!input.description?.trim()) fail("INVALID_INPUT", "Each deduction needs a description.");
    return {
      id: randomUUID(),
      category: input.category,
      description: input.description.trim(),
      amountCents: input.amountCents,
      evidenceNote: input.evidenceNote?.trim() || undefined,
    };
  });
  if (deductions.reduce((sum, item) => sum + item.amountCents, 0) > bondRecord.bondAmountCents) {
    fail("INVALID_INPUT", "Deductions cannot exceed the bond amount.");
  }
  return deductions;
}

function buildProposal(entry: StoredCase, actor: BondActor & { role: PartyRole }, input: ProposeTermsInput, version: number): void {
  const deductions = validateDeductions(entry.bond, input.deductions);
  const paymentToLandlordCents = deductions.reduce((sum, item) => sum + item.amountCents, 0);
  const transactionId = entry.settlement?.transactionId ?? `TX-${randomUUID().slice(0, 8).toUpperCase()}`;
  if (usedTransactionIds.has(transactionId)) fail("TRANSACTION_REPLAY", "Transaction ID has already been used.");
  const agreementVersion = `v${version}`;
  const recipient = entry.bond.renter.id;
  const amountInCents = entry.bond.bondAmountCents - paymentToLandlordCents;
  const payloadHash = hashBondReleasePayload({
    bondId: entry.bond.id,
    recipient,
    amountInCents,
    agreementVersion,
    transactionId,
  });
  const proposal: SettlementProposal = {
    version,
    proposedBy: actor.role,
    createdAt: now(),
    deductions,
    refundToRenterCents: amountInCents,
    paymentToLandlordCents,
    payloadHash,
    note: input.note?.trim() || undefined,
  };
  const settlement: SettlementCase = entry.settlement ?? {
    transactionId,
    status: "pending",
    currentProposal: proposal,
    approvals: [],
    dispute: null,
    release: null,
    timeline: [],
  };
  settlement.currentProposal = proposal;
  settlement.status = "pending";
  settlement.approvals = [];
  settlement.dispute = null;
  entry.settlement = settlement;
  entry.canonical = { agreementVersion, recipient, amountInCents, payloadHash };
  event(settlement, version === 1 ? "request-created" : "proposal-revised", actor.role, `${actor.role} proposed settlement terms (v${version}).`);
  if (version > 1) event(settlement, "approvals-reset", "system", "Terms changed, so earlier approvals no longer apply.");
}

function assertCurrentPayload(entry: StoredCase, proposalVersion: number, payloadHash?: string): void {
  const settlement = entry.settlement;
  if (!settlement) fail("INVALID_INPUT", "There is no settlement for this bond.");
  if (proposalVersion !== settlement.currentProposal.version) fail("STALE_VERSION", "Only the current proposal version can be used.");
  const currentHash = entry.canonical?.payloadHash;
  if (!currentHash) fail("INVALID_INPUT", "The server has no canonical release payload.");
  if (payloadHash !== undefined && payloadHash !== currentHash) fail("PAYLOAD_MISMATCH", "The request does not match the current canonical payload.");
}

function assertQuorum(entry: StoredCase): { renter: Approval; landlord: Approval } {
  const approvals = (entry.settlement?.approvals ?? []) as Array<Approval & { payloadHash?: string }>;
  const renterApproval = approvals.find((approval) => approval.role === "renter");
  const landlordApproval = approvals.find((approval) => approval.role === "landlord");
  if (!renterApproval || !landlordApproval) fail("APPROVAL_QUORUM_INCOMPLETE", "One renter and one landlord approval are required.");
  if (renterApproval.partyId === landlordApproval.partyId) fail("APPROVAL_QUORUM_INCOMPLETE", "Approvals must come from two distinct identities.");
  const hashes = approvals.map((approval) => approval.payloadHash);
  if (hashes.some((hash) => hash !== entry.canonical?.payloadHash)) fail("PAYLOAD_MISMATCH", "Every approval must cover the same canonical payload.");
  return { renter: renterApproval, landlord: landlordApproval };
}

export class BondService {
  constructor(private readonly policy: BondReleasePolicyAdapter = bondReleasePolicy) {}

  list(actor: BondActor): BondSummary[] {
    return cases.filter((entry) => canView(entry, actor)).map((entry) => {
      const settlement = entry.settlement;
      const myApproval = settlement?.approvals.some((approval) => approval.partyId === actor.id) ?? false;
      return {
        bondId: entry.bond.id,
        propertyAddress: entry.bond.propertyAddress,
        bondAmountCents: entry.bond.bondAmountCents,
        counterpartyName: actor.role === "renter" ? entry.bond.landlord.displayName : entry.bond.renter.displayName,
        status: settlement?.status ?? "no-request",
        refundToRenterCents: settlement?.currentProposal.refundToRenterCents ?? null,
        awaitingMyApproval: settlement?.status === "pending" && !myApproval,
        updatedAt: settlement?.timeline.at(-1)?.at ?? entry.bond.tenancyEndDate,
      };
    });
  }

  get(bondId: string, actor: BondActor): BondCase {
    return clone(ownCase(bondId, actor));
  }

  propose(bondId: string, actor: BondActor, input: ProposeTermsInput): BondCase {
    requireParty(actor);
    const entry = ownCase(bondId, actor);
    if (input.basedOnVersion === null) {
      if (actor.role !== "renter") fail("FORBIDDEN", "Only the renter can open the first refund request.");
      if (entry.settlement) fail("STALE_VERSION", "A settlement already exists for this bond.");
      buildProposal(entry, actor, input, 1);
    } else {
      if (!entry.settlement) fail("INVALID_INPUT", "Open a refund request first.");
      if (entry.settlement.status === "approved") fail("DISPUTE_OPEN", "Approved terms cannot be changed.");
      if (input.basedOnVersion !== entry.settlement.currentProposal.version) fail("STALE_VERSION", "The terms changed while you were editing.");
      buildProposal(entry, actor, input, input.basedOnVersion + 1);
    }
    return clone(entry);
  }

  approve(bondId: string, actor: BondActor, input: { proposalVersion: number; payloadHash?: string; decision?: ApprovalDecision }): BondCase {
    requireParty(actor);
    const entry = ownCase(bondId, actor);
    const settlement = entry.settlement ?? fail("INVALID_INPUT", "There is nothing to approve yet.");
    if (settlement.status === "disputed") fail("DISPUTE_OPEN", "A disputed settlement cannot be approved.");
    if (settlement.status === "approved") fail("DUPLICATE_APPROVAL", "These terms are already approved.");
    assertCurrentPayload(entry, input.proposalVersion, input.payloadHash);
    if (input.decision !== undefined && input.decision !== "approved" && input.decision !== "rejected") {
      fail("INVALID_INPUT", "Decision must be approved or rejected.");
    }
    if (input.decision === "rejected") {
      settlement.dispute = {
        raisedBy: actor.role,
        raisedAt: now(),
        reason: `${actor.role} rejected the proposed settlement terms.`,
        intendedPathway: "undecided",
      };
      settlement.status = "disputed";
      event(settlement, "dispute-raised", actor.role, `${actor.role} rejected the proposed settlement terms; settlement is on hold.`);
      return clone(entry);
    }
    if (settlement.approvals.some((approval) => approval.partyId === actor.id)) fail("DUPLICATE_APPROVAL", "This identity already approved the current terms.");
    settlement.approvals.push({
      partyId: actor.id,
      role: actor.role,
      proposalVersion: input.proposalVersion,
      approvedAt: now(),
      enforcement: "simulated",
      payloadHash: entry.canonical?.payloadHash,
    } as Approval & { payloadHash: string });
    event(settlement, "approval-recorded", actor.role, `${actor.role} approval recorded (simulated).`);
    if (settlement.approvals.some((approval) => approval.role === "renter") && settlement.approvals.some((approval) => approval.role === "landlord")) {
      settlement.status = "approved";
      event(settlement, "settlement-approved", "system", "Both parties approved identical terms. Policy authorization remains simulated.");
    }
    return clone(entry);
  }

  dispute(bondId: string, actor: BondActor, input: RaiseDisputeInput): BondCase {
    requireParty(actor);
    const entry = ownCase(bondId, actor);
    const settlement = entry.settlement ?? fail("INVALID_INPUT", "There is nothing to dispute yet.");
    if (settlement.status === "approved") fail("DISPUTE_OPEN", "Approved terms cannot be disputed through this prototype.");
    if (settlement.status === "disputed") fail("DISPUTE_OPEN", "This settlement is already disputed.");
    if (!input.reason?.trim()) fail("INVALID_INPUT", "A dispute reason is required.");
    settlement.dispute = { raisedBy: actor.role, raisedAt: now(), reason: input.reason.trim(), intendedPathway: input.intendedPathway };
    settlement.status = "disputed";
    event(settlement, "dispute-raised", actor.role, `${actor.role} opened a dispute. RTBA and Victorian legal pathways remain separate.`);
    return clone(entry);
  }

  async release(bondId: string, actor: BondActor, input: RequestReleaseInput): Promise<BondCase> {
    requireParty(actor);
    const entry = ownCase(bondId, actor);
    const settlement = entry.settlement ?? fail("INVALID_INPUT", "There is no settlement to release.");
    if (settlement.status !== "approved") fail("APPROVAL_QUORUM_INCOMPLETE", "Both parties must approve before release.");
    assertCurrentPayload(entry, input.proposalVersion, input.payloadHash);
    const quorum = assertQuorum(entry);
    if (settlement.release && settlement.release.status !== "rejected") fail("RELEASE_ALREADY_EXISTS", "This transaction has already been released or requested.");
    if (usedTransactionIds.has(settlement.transactionId)) fail("TRANSACTION_REPLAY", "This transaction ID has already been used.");
    const canonical = entry.canonical ?? fail("INVALID_INPUT", "The server has no canonical release payload.");
    const authorization = await this.policy.authorize({
      bondId: entry.bond.id,
      recipient: canonical.recipient,
      amountInCents: canonical.amountInCents,
      agreementVersion: canonical.agreementVersion,
      transactionId: settlement.transactionId,
      payloadHash: canonical.payloadHash,
      renterApproverId: quorum.renter.partyId,
      landlordApproverId: quorum.landlord.partyId,
    });
    usedTransactionIds.add(settlement.transactionId);
    settlement.release = {
      releaseAttemptId: randomUUID(),
      transactionId: settlement.transactionId,
      proposalVersion: settlement.currentProposal.version,
      requestedBy: actor.role,
      status: "simulated",
      authorizationMode: authorization.mode === "forseti" ? "forseti" : "simulation",
      createdAt: now(),
    };
    event(settlement, "release-requested", actor.role, "Release authorization passed the configured policy adapter; no money moved.");
    return clone(entry);
  }
}

export const bondService = new BondService();
