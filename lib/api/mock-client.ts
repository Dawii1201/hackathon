/**
 * SIMULATION ONLY — in-browser stand-in for the TideRent backend.
 *
 * This module plays the role of the server so the UI can be built before the
 * real API exists. It is NOT a security boundary: anything in the browser can
 * be changed by the user. It provides no TideCloak authentication, no Forseti
 * policy, no cryptographic approval and no money movement. Every approval it
 * records is labelled `enforcement: "simulated"`.
 *
 * The rules it applies (version-bound approvals, distinct parties, approvals
 * reset when terms change) mirror PLAN.md so the UX matches what the real
 * backend will enforce. Status is computed here, never in UI components.
 */
import {
  type ApproveInput,
  type Bond,
  BondApiError,
  type BondApi,
  type BondCase,
  type BondSummary,
  type Deduction,
  type DeductionInput,
  type PartyRole,
  type ProposeTermsInput,
  type RaiseDisputeInput,
  type RequestReleaseInput,
  type SettlementCase,
  type SettlementProposal,
  type TimelineEvent,
} from "./types";

const renter = { id: "renter-jordan", displayName: "Jordan Lee", role: "renter" as const };
const otherRenter = { id: "renter-sam", displayName: "Sam Rivera", role: "renter" as const };
const landlord = { id: "landlord-priya", displayName: "Priya Shah", role: "landlord" as const };

/** The simulated signed-in party for each demo role. */
const demoPartyByRole = { renter, landlord };

let idCounter = 1000;
const nextId = (prefix: string) => `${prefix}-${++idCounter}`;
const now = () => new Date().toISOString();

function proposal(
  version: number,
  proposedBy: PartyRole,
  bondAmountCents: number,
  deductions: Deduction[],
  createdAt: string,
  note?: string,
): SettlementProposal {
  const paymentToLandlordCents = deductions.reduce((sum, d) => sum + d.amountCents, 0);
  return {
    version,
    proposedBy,
    createdAt,
    deductions,
    refundToRenterCents: bondAmountCents - paymentToLandlordCents,
    paymentToLandlordCents,
    note,
  };
}

function seed(): BondCase[] {
  const b1: Bond = {
    id: "TR-2048",
    rtbaReference: "SIM-0042-2048",
    propertyAddress: "12 Example Street, Brunswick VIC",
    bondAmountCents: 230000,
    tenancyEndDate: "2026-09-30",
    renter,
    landlord,
  };
  const b2: Bond = {
    id: "TR-1975",
    rtbaReference: "SIM-0042-1975",
    propertyAddress: "4/88 Sample Road, Fitzroy VIC",
    bondAmountCents: 180000,
    tenancyEndDate: "2025-12-15",
    renter,
    landlord,
  };
  const b3: Bond = {
    id: "TR-2101",
    rtbaReference: "SIM-0042-2101",
    propertyAddress: "7 Demo Lane, Carlton VIC",
    bondAmountCents: 260000,
    tenancyEndDate: "2026-10-05",
    renter,
    landlord,
  };
  const b4: Bond = {
    id: "TR-2155",
    rtbaReference: "SIM-0042-2155",
    propertyAddress: "21 Placeholder Avenue, Coburg VIC",
    bondAmountCents: 210000,
    tenancyEndDate: "2026-10-18",
    renter: otherRenter,
    landlord,
  };

  const b1Deductions: Deduction[] = [
    { id: "d-1", category: "cleaning", description: "Oven and rangehood not cleaned", amountCents: 18000, evidenceNote: "Exit condition report, kitchen photos 3–5" },
    { id: "d-2", category: "keys-and-locks", description: "One garage remote not returned", amountCents: 8000 },
  ];
  const b3Deductions: Deduction[] = [
    { id: "d-3", category: "damage", description: "Bedroom carpet stain replacement", amountCents: 90000, evidenceNote: "Quote from flooring contractor" },
  ];

  return [
    {
      bond: b1,
      settlement: {
        transactionId: "TX-7F2A",
        status: "pending",
        currentProposal: proposal(2, "landlord", b1.bondAmountCents, b1Deductions, "2026-10-12T03:20:00.000Z", "Deductions based on the exit condition report."),
        approvals: [{ partyId: landlord.id, role: "landlord", proposalVersion: 2, approvedAt: "2026-10-12T03:21:00.000Z", enforcement: "simulated" }],
        dispute: null,
        release: null,
        timeline: [
          { id: "e-1", type: "request-created", actorRole: "renter", at: "2026-10-08T09:00:00.000Z", summary: "Jordan requested a full refund of the bond (v1)." },
          { id: "e-2", type: "proposal-revised", actorRole: "landlord", at: "2026-10-12T03:20:00.000Z", summary: "Priya proposed two deductions totalling $260.00 (v2)." },
          { id: "e-3", type: "approvals-reset", actorRole: "system", at: "2026-10-12T03:20:00.000Z", summary: "Terms changed, so earlier approvals no longer apply." },
          { id: "e-4", type: "approval-recorded", actorRole: "landlord", at: "2026-10-12T03:21:00.000Z", summary: "Priya approved v2 (simulated)." },
        ],
      },
    },
    {
      bond: b2,
      settlement: {
        transactionId: "TX-51C9",
        status: "approved",
        currentProposal: proposal(1, "renter", b2.bondAmountCents, [], "2025-12-16T01:00:00.000Z"),
        approvals: [
          { partyId: renter.id, role: "renter", proposalVersion: 1, approvedAt: "2025-12-16T01:01:00.000Z", enforcement: "simulated" },
          { partyId: landlord.id, role: "landlord", proposalVersion: 1, approvedAt: "2025-12-17T22:40:00.000Z", enforcement: "simulated" },
        ],
        dispute: null,
        release: null,
        timeline: [
          { id: "e-5", type: "request-created", actorRole: "renter", at: "2025-12-16T01:00:00.000Z", summary: "Jordan requested a full refund of the bond (v1)." },
          { id: "e-6", type: "approval-recorded", actorRole: "renter", at: "2025-12-16T01:01:00.000Z", summary: "Jordan approved v1 (simulated)." },
          { id: "e-7", type: "approval-recorded", actorRole: "landlord", at: "2025-12-17T22:40:00.000Z", summary: "Priya approved v1 (simulated)." },
          { id: "e-8", type: "settlement-approved", actorRole: "system", at: "2025-12-17T22:40:00.000Z", summary: "Both parties approved the same terms. Release is not performed by this prototype." },
        ],
      },
    },
    {
      bond: b3,
      settlement: {
        transactionId: "TX-93DE",
        status: "disputed",
        currentProposal: proposal(2, "landlord", b3.bondAmountCents, b3Deductions, "2026-10-14T05:00:00.000Z"),
        approvals: [{ partyId: landlord.id, role: "landlord", proposalVersion: 2, approvedAt: "2026-10-14T05:01:00.000Z", enforcement: "simulated" }],
        dispute: {
          raisedBy: "renter",
          raisedAt: "2026-10-15T08:30:00.000Z",
          reason: "The stain was recorded in the entry condition report, so it is not new damage.",
          intendedPathway: "rdrv",
        },
        release: null,
        timeline: [
          { id: "e-9", type: "request-created", actorRole: "renter", at: "2026-10-09T02:00:00.000Z", summary: "Jordan requested a full refund of the bond (v1)." },
          { id: "e-10", type: "proposal-revised", actorRole: "landlord", at: "2026-10-14T05:00:00.000Z", summary: "Priya proposed a $900.00 carpet deduction (v2)." },
          { id: "e-11", type: "approval-recorded", actorRole: "landlord", at: "2026-10-14T05:01:00.000Z", summary: "Priya approved v2 (simulated)." },
          { id: "e-12", type: "dispute-raised", actorRole: "renter", at: "2026-10-15T08:30:00.000Z", summary: "Jordan disputed v2 and intends to contact RDRV." },
        ],
      },
    },
    { bond: b4, settlement: null },
    {
      bond: {
        id: "TR-2190",
        rtbaReference: "SIM-0042-2190",
        propertyAddress: "3/15 Mock Parade, Northcote VIC",
        bondAmountCents: 195000,
        tenancyEndDate: "2026-10-20",
        renter,
        landlord,
      },
      settlement: null,
    },
  ];
}

/** Module-level store: survives client-side navigation, resets on full reload. */
let store: BondCase[] = seed();

export function resetMockStore() {
  store = seed();
}

function fail(code: ConstructorParameters<typeof BondApiError>[0]["code"], message: string): never {
  throw new BondApiError({ code, message });
}

function validateDeductions(bond: Bond, inputs: DeductionInput[]): Deduction[] {
  const deductions = inputs.map((d) => {
    if (!Number.isInteger(d.amountCents) || d.amountCents <= 0) fail("invalid-input", "Each deduction must be a positive amount.");
    if (!d.description.trim()) fail("invalid-input", "Each deduction needs a description.");
    return { ...d, description: d.description.trim(), id: nextId("d") };
  });
  const total = deductions.reduce((sum, d) => sum + d.amountCents, 0);
  if (total > bond.bondAmountCents) fail("invalid-input", "Deductions cannot exceed the bond amount.");
  return deductions;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function createMockBondApi(role: PartyRole): BondApi {
  const me = demoPartyByRole[role];

  function findOwnCase(bondId: string): BondCase {
    const found = store.find((c) => c.bond.id === bondId);
    // Treat other people's bonds as not found, as a real backend should.
    if (!found || found.bond[role].id !== me.id) fail("not-found", "Bond not found.");
    return found;
  }

  function event(settlement: SettlementCase, type: TimelineEvent["type"], actorRole: TimelineEvent["actorRole"], summary: string) {
    settlement.timeline.push({ id: nextId("e"), type, actorRole, at: now(), summary });
  }

  const delay = () => new Promise((resolve) => setTimeout(resolve, 150));

  return {
    mode: "mock",

    async listMyBonds() {
      await delay();
      return store
        .filter((c) => c.bond[role].id === me.id)
        .map<BondSummary>(({ bond, settlement }) => {
          const counterparty = role === "renter" ? bond.landlord : bond.renter;
          const iApproved = settlement?.approvals.some((a) => a.role === role) ?? false;
          return {
            bondId: bond.id,
            propertyAddress: bond.propertyAddress,
            bondAmountCents: bond.bondAmountCents,
            counterpartyName: counterparty.displayName,
            status: settlement?.status ?? "no-request",
            refundToRenterCents: settlement?.currentProposal.refundToRenterCents ?? null,
            awaitingMyApproval: settlement?.status === "pending" && !iApproved,
            updatedAt: settlement?.timeline.at(-1)?.at ?? bond.tenancyEndDate,
          };
        });
    },

    async getBondCase(bondId) {
      await delay();
      return clone(findOwnCase(bondId));
    },

    async proposeTerms(bondId, input: ProposeTermsInput) {
      await delay();
      const c = findOwnCase(bondId);

      // First proposal = the renter's refund request.
      if (input.basedOnVersion === null) {
        if (role !== "renter") fail("forbidden", "Only the renter can open a refund request.");
        if (c.settlement) fail("stale-version", "A refund request already exists for this bond. Review the latest version.");
        const deductions = validateDeductions(c.bond, input.deductions);
        const settlement: SettlementCase = {
          transactionId: nextId("TX"),
          status: "pending",
          currentProposal: proposal(1, role, c.bond.bondAmountCents, deductions, now(), input.note),
          approvals: [],
          dispute: null,
          release: null,
          timeline: [],
        };
        event(settlement, "request-created", role, `${me.displayName} requested ${money(settlement.currentProposal.refundToRenterCents)} back (v1).`);
        c.settlement = settlement;
        return clone(c);
      }

      const s = c.settlement ?? fail("invalid-state", "Open a refund request first.");
      if (s.status === "approved") fail("invalid-state", "Both parties already approved these terms.");
      if (input.basedOnVersion !== s.currentProposal.version) fail("stale-version", "The terms changed while you were editing. Review the latest version.");
      const deductions = validateDeductions(c.bond, input.deductions);
      const version = s.currentProposal.version + 1;
      s.currentProposal = proposal(version, role, c.bond.bondAmountCents, deductions, now(), input.note);
      event(s, "proposal-revised", role, `${me.displayName} proposed ${money(s.currentProposal.paymentToLandlordCents)} in deductions (v${version}).`);
      if (s.approvals.length) event(s, "approvals-reset", "system", "Terms changed, so earlier approvals no longer apply.");
      s.approvals = [];
      if (s.dispute) {
        // New terms reopen negotiation; the dispute stays in the timeline.
        s.dispute = null;
      }
      s.status = "pending";
      return clone(c);
    },

    async approve(bondId, input: ApproveInput) {
      await delay();
      const c = findOwnCase(bondId);
      const s = c.settlement ?? fail("invalid-state", "There is nothing to approve yet.");
      if (s.status === "disputed") fail("invalid-state", "This settlement is disputed. Propose new terms to reopen negotiation.");
      if (s.status === "approved") fail("invalid-state", "These terms are already approved.");
      if (input.proposalVersion !== s.currentProposal.version) fail("stale-version", "You can only approve the latest version of the terms.");
      if (input.payloadHash !== undefined && input.payloadHash !== s.currentProposal.payloadHash) fail("stale-version", "The approval does not match the current terms.");
      if (input.decision !== undefined && input.decision !== "approved" && input.decision !== "rejected") fail("invalid-input", "Decision must be approved or rejected.");
      if (input.decision === "rejected") {
        s.dispute = { raisedBy: role, raisedAt: now(), reason: `${me.displayName} rejected the proposed settlement terms.`, intendedPathway: "undecided" };
        s.status = "disputed";
        event(s, "dispute-raised", role, `${me.displayName} rejected the proposed settlement terms; settlement is on hold.`);
        return clone(c);
      }
      if (s.approvals.some((a) => a.partyId === me.id)) fail("invalid-state", "You already approved this version.");
      s.approvals.push({ partyId: me.id, role, proposalVersion: input.proposalVersion, approvedAt: now(), enforcement: "simulated" });
      event(s, "approval-recorded", role, `${me.displayName} approved v${input.proposalVersion} (simulated).`);
      const roles = new Set(s.approvals.map((a) => a.role));
      if (roles.has("renter") && roles.has("landlord")) {
        s.status = "approved";
        event(s, "settlement-approved", "system", "Both parties approved the same terms. Release is not performed by this prototype.");
      }
      return clone(c);
    },

    async raiseDispute(bondId, input: RaiseDisputeInput) {
      await delay();
      const c = findOwnCase(bondId);
      const s = c.settlement ?? fail("invalid-state", "There is nothing to dispute yet.");
      if (s.status === "approved") fail("invalid-state", "Both parties already approved these terms.");
      if (s.status === "disputed") fail("invalid-state", "This settlement is already disputed.");
      if (!input.reason.trim()) fail("invalid-input", "Please explain what you disagree with.");
      s.dispute = { raisedBy: role, raisedAt: now(), reason: input.reason.trim(), intendedPathway: input.intendedPathway };
      s.status = "disputed";
      event(s, "dispute-raised", role, `${me.displayName} disputed v${s.currentProposal.version}.`);
      return clone(c);
    },

    /**
     * Simulated policy check. A real backend would rebuild the canonical
     * payload and ask Forseti; here we only re-check the same rules and record
     * a release attempt with authorizationMode "simulation". No money moves.
     */
    async requestRelease(bondId, input: RequestReleaseInput) {
      await delay();
      const c = findOwnCase(bondId);
      const s = c.settlement ?? fail("invalid-state", "There is no settlement to release.");
      if (s.status !== "approved") fail("invalid-state", "Both parties must approve the same terms before a release can be requested.");
      if (input.proposalVersion !== s.currentProposal.version) fail("stale-version", "The release request does not match the approved terms.");
      if (input.payloadHash !== undefined && input.payloadHash !== s.currentProposal.payloadHash) fail("stale-version", "The release request does not match the approved terms.");
      const quorum = s.approvals.filter((a) => a.proposalVersion === s.currentProposal.version);
      const distinctParties = new Set(quorum.map((a) => a.partyId));
      const roles = new Set(quorum.map((a) => a.role));
      if (distinctParties.size < 2 || !roles.has("renter") || !roles.has("landlord")) fail("invalid-state", "Approval quorum is incomplete.");
      if (s.release && s.release.status !== "rejected") fail("invalid-state", `A release was already requested for ${s.transactionId}. Each transaction can only be released once.`);
      s.release = {
        releaseAttemptId: nextId("REL"),
        transactionId: s.transactionId,
        proposalVersion: s.currentProposal.version,
        requestedBy: role,
        status: "simulated",
        authorizationMode: "simulation",
        createdAt: now(),
      };
      event(s, "release-requested", role, `${me.displayName} requested release of ${s.transactionId}. Simulated policy check passed; no money moved.`);
      return clone(c);
    },
  };
}

export function getDemoParty(role: PartyRole) {
  return demoPartyByRole[role];
}
