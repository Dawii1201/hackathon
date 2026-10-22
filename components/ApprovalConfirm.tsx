"use client";

import { useEffect, useRef, useState } from "react";
import type { Bond, PartyRole, SettlementCase } from "../lib/api/types";
import { deductionCategoryLabels, formatDate, formatDateTime, formatMoney } from "../lib/format";
import { CheckCircleIcon } from "./icons";
import { MotionButton } from "./MotionButton";

interface Props {
  bond: Bond;
  settlement: SettlementCase;
  role: PartyRole;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const normalise = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Review-and-confirm step before an approval is sent.
 *
 * Typing your name and ticking the box are deliberate-action friction only.
 * They are NOT a signature: nothing typed here is sent to the backend, and the
 * approval request carries only the proposal version (and payloadHash when the
 * server provides one). Real signing belongs to the Tide/Forseti integration.
 */
export function ApprovalConfirm({ bond, settlement, role, busy, onConfirm, onCancel }: Props) {
  const me = role === "renter" ? bond.renter : bond.landlord;
  const p = settlement.currentProposal;
  const [name, setName] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const nameMatches = normalise(name) === normalise(me.displayName);
  const canApprove = nameMatches && reviewed && !busy;

  // Keep the latest onCancel without re-running effects (callers pass inline arrows).
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section aria-labelledby="confirm-title" className="fade-up relative mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_23rem]">
      {/* Agreement sheet */}
      <article className="rounded-[1.75rem] border border-[#e6e9ec] bg-white p-6 shadow-sm sm:p-10 lg:pr-24">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#5f6b76]">Review before approving</p>
        <h2 id="confirm-title" className="mt-2 text-2xl font-bold sm:text-3xl">
          Settlement agreement · v{p.version}
        </h2>

        <SheetSection title="General">
          <Row label="Bond" value={bond.id} />
          <Row label="Property" value={bond.propertyAddress} />
          <Row label="Tenancy ended" value={formatDate(bond.tenancyEndDate)} />
          <Row label="RTBA reference" value={`${bond.rtbaReference} (not verified)`} />
          <Row label="Transaction ID" value={settlement.transactionId} />
          <Row label="Proposed by" value={`The ${p.proposedBy} · ${formatDateTime(p.createdAt)}`} />
        </SheetSection>

        <SheetSection title="Parties">
          <Row label="Renter" value={bond.renter.displayName} />
          <Row label="Landlord" value={bond.landlord.displayName} />
        </SheetSection>

        <SheetSection title="Deductions">
          {p.deductions.length === 0 && <Row label="None" value="Full bond returned to the renter" />}
          {p.deductions.map((d) => (
            <Row key={d.id} label={deductionCategoryLabels[d.category]} value={d.description} amount={formatMoney(d.amountCents)} />
          ))}
        </SheetSection>

        <SheetSection title="Payout">
          <Row label="Bond held" value="" amount={formatMoney(bond.bondAmountCents)} />
          <Row label="To landlord" value="" amount={formatMoney(p.paymentToLandlordCents)} />
          <Row label="To renter" value="" amount={formatMoney(p.refundToRenterCents)} strong />
        </SheetSection>

        {p.payloadHash && <p className="mt-6 break-all font-mono text-xs text-[#5f6b76]">Payload hash: {p.payloadHash}</p>}
      </article>

      {/* Confirmation card, overlapping the sheet on large screens */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canApprove) onConfirm();
        }}
        className="relative z-10 mt-4 rounded-[1.75rem] bg-[#efe7e1] p-6 shadow-[0_24px_60px_rgba(27,39,51,.16)] sm:p-8 lg:-ml-16 lg:mt-48 lg:self-start"
      >
        <h3 className="text-xl font-bold">Your confirmation</h3>
        <p className="mt-1 text-sm leading-6 text-[#4a5560]">
          Approving as the <strong>{role}</strong>. This counts only for version {p.version}. If anyone changes the terms, it resets.
        </p>

        <label className="mt-6 block text-sm font-semibold" htmlFor="confirm-name">
          Type your full name
        </label>
        <input
          id="confirm-name"
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          placeholder={me.displayName}
          aria-describedby="confirm-name-hint"
          className={`mt-2 w-full rounded-full border-2 bg-white px-5 py-3 text-base outline-none transition focus:ring-4 ${
            name && !nameMatches ? "border-[#e5b8a9] focus:ring-[#a3341f]/15" : nameMatches ? "border-[#0b4f43] focus:ring-[#0b4f43]/20" : "border-transparent focus:ring-[#0b4f43]/20"
          }`}
        />
        <p id="confirm-name-hint" aria-live="polite" className={`mt-2 text-xs ${nameMatches ? "font-semibold text-[#0b4f43]" : "text-[#5f6b76]"}`}>
          {nameMatches ? "✓ Name matches your account" : `Enter the name on your account: ${me.displayName}`}
        </p>

        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6">
          <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#0b4f43]" />
          <span>
            I&apos;ve checked every line. I agree that the renter receives <strong>{formatMoney(p.refundToRenterCents)}</strong> and the landlord
            receives <strong>{formatMoney(p.paymentToLandlordCents)}</strong>.
          </span>
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <MotionButton type="submit" variant="primary" size="lg" icon={<CheckCircleIcon />} disabled={!canApprove}>
            {busy ? "Recording…" : `Approve v${p.version}`}
          </MotionButton>
          <MotionButton variant="ghost" size="lg" onClick={onCancel}>
            Cancel
          </MotionButton>
        </div>

        <p className="mt-5 rounded-xl bg-[#fff6e0] p-3 text-xs leading-5 text-[#6b4f14]">
          Simulated approval. Your typed name is not a signature and is not sent anywhere. Real signing will come from Tide/Forseti.
        </p>
      </form>
    </section>
  );
}

function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold">{title}</h3>
      <dl className="mt-3 divide-y divide-[#f1f3f5]">{children}</dl>
    </div>
  );
}

function Row({ label, value, amount, strong }: { label: string; value: string; amount?: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)_auto] gap-3 py-2.5 text-sm sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
      <dt className="text-[#5f6b76]">{label}</dt>
      <dd className="break-words">{value}</dd>
      {amount !== undefined && <dd className={`text-right tabular-nums ${strong ? "text-base font-bold text-[#0b4f43]" : "font-semibold"}`}>{amount}</dd>}
    </div>
  );
}
