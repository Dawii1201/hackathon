"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getBondApi, type BondCase, type PartyRole, type SettlementCase } from "../lib/api";
import { deductionCategoryLabels, disputePathwayLabels, formatDate, formatDateTime, formatMoney } from "../lib/format";
import { ApprovalConfirm } from "./ApprovalConfirm";
import { DeductionEditor } from "./DeductionEditor";
import { DisputeForm } from "./DisputeForm";
import { AlertIcon, BookIcon, CheckCircleIcon, SendIcon, SwapIcon } from "./icons";
import { MotionButton } from "./MotionButton";
import { StatusBadge } from "./StatusBadge";
import { SecurityEvidence } from "./SecurityEvidence";

type Mode = "view" | "edit" | "dispute" | "confirm-approve";

/**
 * Bond case screen for one party. Every action is a request to the API; the
 * component only renders the case the API returns and never sets status
 * itself.
 */
export function BondWorkspace({ role, bondId }: { role: PartyRole; bondId: string }) {
  const api = useMemo(() => getBondApi(role), [role]);
  const [data, setData] = useState<BondCase | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getBondCase(bondId).then(setData, (e: Error) => setLoadError(e.message));
  }, [api, bondId]);

  /** Runs an API action and replaces local state with the server's answer. */
  const run = useCallback(async (action: () => Promise<BondCase>) => {
    setActionError(null);
    setBusy(true);
    try {
      setData(await action());
      setMode("view");
    } finally {
      setBusy(false);
    }
  }, []);

  const runAndShowError = (action: () => Promise<BondCase>) => run(action).catch((e: Error) => setActionError(e.message));

  if (loadError) {
    return (
      <Shell role={role}>
        <p className="rounded-xl bg-[#fbe3dc] p-4 text-sm text-[#9b3a22]">{loadError}</p>
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell role={role}>
        <p className="text-sm text-[#5f6b76]">Loading bond…</p>
      </Shell>
    );
  }

  const { bond, settlement } = data;
  const counterparty = role === "renter" ? bond.landlord : bond.renter;

  return (
    <Shell role={role}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#5f6b76]">Bond {bond.id}</p>
          <h1 className="display mt-2 text-3xl leading-tight sm:text-4xl">{bond.propertyAddress}</h1>
          <p className="mt-2 text-sm text-[#5f6b76]">
            {role === "renter" ? "Landlord" : "Renter"}: {counterparty.displayName} · Tenancy ended {formatDate(bond.tenancyEndDate)}
          </p>
        </div>
        <StatusBadge status={settlement?.status ?? "no-request"} />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Fact label="Bond amount" value={formatMoney(bond.bondAmountCents)} />
        <Fact label="RTBA reference (not verified)" value={bond.rtbaReference} />
        <Fact label="Transaction ID" value={settlement?.transactionId ?? "—"} />
      </dl>

      {actionError && (
        <p role="alert" className="mt-6 rounded-xl bg-[#fbe3dc] p-4 text-sm text-[#9b3a22]">
          {actionError}
        </p>
      )}

      {settlement && mode === "confirm-approve" ? (
        <ApprovalConfirm
          bond={bond}
          settlement={settlement}
          role={role}
          busy={busy}
          onCancel={() => setMode("view")}
          onReject={() =>
            runAndShowError(() =>
              api.approve(bond.id, { proposalVersion: settlement.currentProposal.version, payloadHash: settlement.currentProposal.payloadHash, decision: "rejected" }),
            )
          }
          onConfirm={() =>
            runAndShowError(() =>
              api.approve(bond.id, { proposalVersion: settlement.currentProposal.version, payloadHash: settlement.currentProposal.payloadHash }),
            )
          }
        />
      ) : (
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {!settlement && role === "renter" && (
            <DeductionEditor
              bondAmountCents={bond.bondAmountCents}
              initial={[]}
              title="Request your bond back"
              hint="Ask for the full bond, or list any deductions you already accept. Your landlord can then approve or propose changes."
              submitLabel="Send refund request"
              onSubmit={(deductions, note) => run(() => api.proposeTerms(bond.id, { basedOnVersion: null, deductions, note: note || undefined }))}
            />
          )}
          {!settlement && role === "landlord" && (
            <Panel>
              <h2 className="text-lg font-bold">Waiting for the renter</h2>
              <p className="mt-2 text-sm leading-6 text-[#5f6b76]">
                The renter has not opened a refund request in Settle yet. Outside this prototype, either party can still use the
                official RTBA claim process.
              </p>
            </Panel>
          )}

          {settlement && mode === "edit" && (
            <DeductionEditor
              bondAmountCents={bond.bondAmountCents}
              initial={settlement.currentProposal.deductions}
              title={settlement.status === "disputed" ? "Propose new terms" : "Propose changes"}
              hint="Sending new terms creates a new version. All earlier approvals stop counting, so both parties must approve again."
              submitLabel={`Send as version ${settlement.currentProposal.version + 1}`}
              onSubmit={(deductions, note) =>
                run(() => api.proposeTerms(bond.id, { basedOnVersion: settlement.currentProposal.version, deductions, note: note || undefined }))
              }
              onCancel={() => setMode("view")}
            />
          )}

          {settlement && mode === "dispute" && (
            <DisputeForm onSubmit={(input) => run(() => api.raiseDispute(bond.id, input))} onCancel={() => setMode("view")} />
          )}

          {settlement && mode !== "edit" && <ProposalCard settlement={settlement} bondAmountCents={bond.bondAmountCents} />}

          {settlement && mode === "view" && (
            <Actions
              role={role}
              settlement={settlement}
              onMode={setMode}
              busy={busy}
              onRequestRelease={() =>
                runAndShowError(() =>
                  api.requestRelease(bond.id, { proposalVersion: settlement.currentProposal.version, payloadHash: settlement.currentProposal.payloadHash }),
                )
              }
            />
          )}
        </div>

        <aside className="space-y-6">
          {settlement && <ApprovalPanel settlement={settlement} renterName={bond.renter.displayName} landlordName={bond.landlord.displayName} />}
          {settlement && <SecurityEvidence bond={bond} settlement={settlement} />}
          {settlement?.dispute && (
            <Panel className="border-[#e5b8a9] bg-[#fdf3ef]">
              <h2 className="text-lg font-bold text-[#9b3a22]">Disputed by the {settlement.dispute.raisedBy}</h2>
              <p className="mt-2 text-sm leading-6">“{settlement.dispute.reason}”</p>
              <p className="mt-3 text-xs text-[#5f6b76]">
                Intended next step: {disputePathwayLabels[settlement.dispute.intendedPathway]} · {formatDateTime(settlement.dispute.raisedAt)}
              </p>
              <Link href="/dispute-guidance" className="mt-4 inline-block text-sm font-bold text-[#0b4f43] underline">
                Victoria dispute pathways →
              </Link>
            </Panel>
          )}
          {settlement && <Timeline settlement={settlement} />}
        </aside>
      </div>
      )}
    </Shell>
  );
}

function Actions({
  role,
  settlement,
  onMode,
  onRequestRelease,
  busy,
}: {
  role: PartyRole;
  settlement: SettlementCase;
  onMode: (m: Mode) => void;
  onRequestRelease: () => void;
  busy: boolean;
}) {
  const iApproved = settlement.approvals.some((a) => a.role === role);

  if (settlement.status === "approved") {
    const release = settlement.release;
    return (
      <Panel className="border-[#0b4f43] bg-[#f1f6f6]">
        <h2 className="text-lg font-bold">Both parties approved version {settlement.currentProposal.version}</h2>
        <p className="mt-2 text-sm leading-6 text-[#5f6b76]">
          You can ask the backend to run the release policy check. Today that check is simulated: a Forseti policy is not deployed yet, no money
          moves, and the official release still happens through RTBA, for example with a bond claim form signed by both parties.
        </p>
        {release ? (
          <div className="mt-4 rounded-xl border border-[#f1dfae] bg-[#fff6e0] p-4 text-sm">
            <p className="font-bold text-[#6b4f14]">
              {release.status === "verified" && release.authorizationMode === "forseti"
                ? "Release authorised by Forseti policy"
                : release.status === "rejected"
                  ? "Release request rejected"
                  : "Simulated release recorded. Not Tide-verified."}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#6b4f14]">
              {release.transactionId} · requested by the {release.requestedBy} · {formatDateTime(release.createdAt)}
              {release.rejectionReason ? ` · ${release.rejectionReason}` : ""}
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <MotionButton variant="primary" icon={<SendIcon />} disabled={busy} onClick={onRequestRelease}>
              {busy ? "Checking…" : "Request simulated release"}
            </MotionButton>
          </div>
        )}
      </Panel>
    );
  }

  if (settlement.status === "disputed") {
    return (
      <Panel>
        <h2 className="text-lg font-bold">This settlement is disputed</h2>
        <p className="mt-2 text-sm leading-6 text-[#5f6b76]">
          You can still settle by agreement. Proposing new terms reopens negotiation, and both parties must approve the new version.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <MotionButton variant="primary" icon={<SwapIcon />} onClick={() => onMode("edit")}>
            Propose new terms
          </MotionButton>
          <MotionButton variant="soft" icon={<BookIcon />} href="/dispute-guidance">
            See official pathways
          </MotionButton>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <h2 className="text-lg font-bold">{iApproved ? "Waiting for the other party" : "Your decision"}</h2>
      <p className="mt-2 text-sm leading-6 text-[#5f6b76]">
        {iApproved
          ? `You approved version ${settlement.currentProposal.version}. You can still propose changes or raise a dispute, but changes reset all approvals.`
          : `Approve version ${settlement.currentProposal.version} if you agree with every line, propose changes, or raise a dispute.`}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {!iApproved && (
          <MotionButton variant="primary" icon={<CheckCircleIcon />} onClick={() => onMode("confirm-approve")}>
            Approve version {settlement.currentProposal.version}
          </MotionButton>
        )}
        <MotionButton variant="soft" icon={<SwapIcon />} onClick={() => onMode("edit")}>
          {role === "landlord" ? "Propose deductions" : "Propose changes"}
        </MotionButton>
        <MotionButton variant="danger" icon={<AlertIcon />} onClick={() => onMode("dispute")}>
          Raise a dispute
        </MotionButton>
      </div>
    </Panel>
  );
}

function ProposalCard({ settlement, bondAmountCents }: { settlement: SettlementCase; bondAmountCents: number }) {
  const p = settlement.currentProposal;
  return (
    <Panel>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">Current terms · version {p.version}</h2>
        <p className="text-xs text-[#5f6b76]">
          Proposed by the {p.proposedBy} · {formatDateTime(p.createdAt)}
        </p>
      </div>
      {p.note && <p className="mt-3 rounded-lg bg-[#f1f6f6] p-3 text-sm italic text-[#455249]">“{p.note}”</p>}
      {p.payloadHash && (
        <p className="mt-2 break-all font-mono text-xs text-[#5f6b76]" title="Computed by the server from the canonical release payload">
          Payload hash: {p.payloadHash}
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[22rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-[.12em] text-[#5f6b76]">
            <tr className="border-b border-[#e5ebe5]">
              <th className="py-2 pr-3 font-semibold">Deduction</th>
              <th className="py-2 pr-3 font-semibold">Evidence</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {p.deductions.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-[#5f6b76]">
                  No deductions proposed.
                </td>
              </tr>
            )}
            {p.deductions.map((d) => (
              <tr key={d.id} className="border-b border-[#eef1ec] align-top">
                <td className="py-3 pr-3">
                  <span className="block text-xs font-bold text-[#5f6b76]">{deductionCategoryLabels[d.category]}</span>
                  {d.description}
                </td>
                <td className="py-3 pr-3 text-[#5f6b76]">{d.evidenceNote ?? "—"}</td>
                <td className="py-3 text-right font-semibold">{formatMoney(d.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-[#f1f6f6] p-4 text-sm">
        <Fact label="Bond" value={formatMoney(bondAmountCents)} plain />
        <Fact label="To landlord" value={formatMoney(p.paymentToLandlordCents)} plain />
        <Fact label="To renter" value={formatMoney(p.refundToRenterCents)} plain />
      </dl>
    </Panel>
  );
}

function ApprovalPanel({ settlement, renterName, landlordName }: { settlement: SettlementCase; renterName: string; landlordName: string }) {
  const version = settlement.currentProposal.version;
  const rows = [
    { role: "renter" as const, name: renterName },
    { role: "landlord" as const, name: landlordName },
  ];
  const count = rows.filter((r) => settlement.approvals.some((a) => a.role === r.role)).length;
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Approvals for v{version}</h2>
        <span className="text-sm font-bold text-[#0b4f43]">{count} of 2</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-[#e6e9ec]">
        <div className="h-2 rounded-full bg-[#0b4f43] transition-all" style={{ width: `${count * 50}%` }} />
      </div>
      <ul className="mt-4 space-y-3 text-sm">
        {rows.map((r) => {
          const approval = settlement.approvals.find((a) => a.role === r.role);
          return (
            <li key={r.role} className="flex items-center justify-between gap-3">
              <span>
                <span className="block font-semibold">{r.name}</span>
                <span className="text-xs capitalize text-[#5f6b76]">{r.role}</span>
              </span>
              {approval ? (
                <span className="text-right text-xs">
                  <span className="block font-bold text-[#0b4f43]">✓ Approved</span>
                  <span className="text-[#8a651d]">{approval.enforcement === "simulated" ? "Simulated" : "Tide-verified"}</span>
                </span>
              ) : (
                <span className="text-xs font-semibold text-[#5f6b76]">Not yet</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 border-t border-[#e5ebe5] pt-3 text-xs leading-5 text-[#5f6b76]">
        Approvals only count for this exact version. They are simulated and not yet protected by Tide.
      </p>
    </Panel>
  );
}

function Timeline({ settlement }: { settlement: SettlementCase }) {
  return (
    <Panel>
      <h2 className="text-lg font-bold">Activity</h2>
      <ol className="mt-4 space-y-4 border-l border-[#e6e9ec] pl-4">
        {[...settlement.timeline].reverse().map((e) => (
          <li key={e.id} className="relative text-sm">
            <span aria-hidden className={`absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full ${e.actorRole === "system" ? "bg-[#d5dde0]" : "bg-[#0b4f43]"}`} />
            <p className="leading-6">{e.summary}</p>
            <p className="text-xs text-[#5f6b76]">{formatDateTime(e.at)}</p>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function Shell({ role, children }: { role: PartyRole; children: React.ReactNode }) {
  return (
    <div className="fade-up mx-auto max-w-[1400px] rounded-[1.75rem] border border-[#e6e9ec] bg-white p-5 shadow-sm sm:p-8" data-role={role}>
      {children}
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#e6e9ec] bg-white p-5 sm:p-6 ${className}`}>{children}</section>;
}

function Fact({ label, value, plain }: { label: string; value: string; plain?: boolean }) {
  return (
    <div className={plain ? "" : "rounded-xl border border-[#e6e9ec] bg-white p-3"}>
      <dt className="text-xs text-[#5f6b76]">{label}</dt>
      <dd className="mt-0.5 break-words font-bold">{value}</dd>
    </div>
  );
}
