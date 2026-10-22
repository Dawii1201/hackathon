import type { Bond, SettlementCase } from "../lib/api/types";
import { formatMoney } from "../lib/format";

/**
 * A judge-facing evidence view. Values are application records only; the
 * panel deliberately never displays tokens, keys, or claims of Tide signing.
 */
export function SecurityEvidence({ bond, settlement }: { bond: Bond; settlement: SettlementCase }) {
  const proposal = settlement.currentProposal;
  const canonicalPayload = [
    bond.id,
    bond.renter.id,
    proposal.refundToRenterCents,
    `v${proposal.version}`,
    settlement.transactionId,
  ].join(" | ");
  const renterApproved = settlement.approvals.some((approval) => approval.role === "renter");
  const landlordApproved = settlement.approvals.some((approval) => approval.role === "landlord");

  return (
    <section className="rounded-2xl border border-[#d7e4e1] bg-[#f7fbfa] p-5 sm:p-6" aria-labelledby="security-evidence-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#0b4f43]">Security evidence</p>
          <h2 id="security-evidence-title" className="mt-1 text-lg font-bold">What the demo is checking</h2>
        </div>
        <span className="rounded-full bg-[#fff1cc] px-3 py-1 text-xs font-bold text-[#8a651d]">SIMULATED_FORSETI</span>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <EvidenceRow label="Bond ID" value={bond.id} />
        <EvidenceRow label="Agreement version" value={`v${proposal.version}`} />
        <EvidenceRow label="Transaction ID" value={settlement.transactionId} />
        <EvidenceRow label="Renter approval" value={renterApproved ? "Approved" : "Not approved"} />
        <EvidenceRow label="Landlord approval" value={landlordApproved ? "Approved" : "Not approved"} />
        <EvidenceRow label="Dispute / hold" value={settlement.dispute ? "HOLD — dispute open" : "No dispute"} />
        <EvidenceRow label="Release status" value={settlement.release?.status ?? "Not requested"} />
        <EvidenceRow label="Refund to renter" value={formatMoney(proposal.refundToRenterCents)} />
      </dl>

      <div className="mt-4 rounded-xl border border-[#d7e4e1] bg-white p-3">
        <p className="text-xs font-bold uppercase tracking-[.12em] text-[#5f6b76]">Canonical payload shown by this demo</p>
        <p className="mt-2 break-all font-mono text-xs leading-5 text-[#1b2733]">{canonicalPayload}</p>
        <p className="mt-2 text-xs leading-5 text-[#5f6b76]">
          The browser demo displays the fields for explanation. A live backend would compute and verify the payload hash server-side.
          {proposal.payloadHash ? ` Server payload hash: ${proposal.payloadHash}` : " This browser simulator has no server payload hash."}
        </p>
      </div>

      <p className="mt-4 text-xs leading-5 text-[#5f6b76]">
        Application-side checks are active for this demo. Forseti threshold signing, Tide authoritative release signatures, and money movement are not active.
      </p>
    </section>
  );
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e5ebe5] bg-white p-3">
      <dt className="text-xs text-[#5f6b76]">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}
