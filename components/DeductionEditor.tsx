"use client";

import { useState } from "react";
import type { Deduction, DeductionCategory, DeductionInput } from "../lib/api/types";
import { deductionCategoryLabels, formatMoney, parseMoneyToCents } from "../lib/format";
import { SendIcon } from "./icons";
import { MotionButton } from "./MotionButton";

interface Row {
  key: number;
  category: DeductionCategory;
  description: string;
  amount: string;
  evidenceNote: string;
}

interface Props {
  bondAmountCents: number;
  initial: Deduction[];
  title: string;
  hint: string;
  submitLabel: string;
  onSubmit: (deductions: DeductionInput[], note: string) => Promise<void>;
  onCancel?: () => void;
}

let rowKey = 0;
const toRow = (d?: Deduction): Row => ({
  key: ++rowKey,
  category: d?.category ?? "cleaning",
  description: d?.description ?? "",
  amount: d ? (d.amountCents / 100).toFixed(2) : "",
  evidenceNote: d?.evidenceNote ?? "",
});

const inputClass =
  "w-full rounded-lg border border-[#d5dde0] bg-white px-3 py-2 text-sm outline-none focus:border-[#0b4f43] focus:ring-2 focus:ring-[#0b4f43]/20";

/**
 * Edits a full set of deductions. Submitting sends the whole set as a new
 * proposal version; the backend recomputes totals and resets approvals.
 */
export function DeductionEditor({ bondAmountCents, initial, title, hint, submitLabel, onSubmit, onCancel }: Props) {
  const [rows, setRows] = useState<Row[]>(() => initial.map(toRow));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = rows.map((r) => parseMoneyToCents(r.amount));
  const totalDeductions = parsed.reduce<number>((sum, c) => sum + (c ?? 0), 0);
  const refund = bondAmountCents - totalDeductions;

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rows.some((r, i) => !r.description.trim() || !parsed[i])) {
      setError("Every deduction needs a description and an amount greater than $0.");
      return;
    }
    if (refund < 0) {
      setError("Deductions cannot be more than the bond.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(
        rows.map((r, i) => ({
          category: r.category,
          description: r.description.trim(),
          amountCents: parsed[i] as number,
          evidenceNote: r.evidenceNote.trim() || undefined,
        })),
        note.trim(),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#0b4f43] bg-white p-5 sm:p-6">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-[#5f6b76]">{hint}</p>

      <div className="mt-5 space-y-4">
        {rows.length === 0 && (
          <p className="rounded-xl bg-[#f1f6f6] p-4 text-sm text-[#5f6b76]">No deductions. The full bond would be refunded to the renter.</p>
        )}
        {rows.map((r, i) => (
          <fieldset key={r.key} className="rounded-xl border border-[#e6e9ec] p-4">
            <legend className="px-1 text-xs font-bold uppercase tracking-[.14em] text-[#5f6b76]">Deduction {i + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr_8rem]">
              <label className="text-xs font-semibold">
                Category
                <select className={`${inputClass} mt-1`} value={r.category} onChange={(e) => update(r.key, { category: e.target.value as DeductionCategory })}>
                  {Object.entries(deductionCategoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold">
                What is it for?
                <input className={`${inputClass} mt-1`} value={r.description} maxLength={200} onChange={(e) => update(r.key, { description: e.target.value })} placeholder="e.g. Carpet steam clean" />
              </label>
              <label className="text-xs font-semibold">
                Amount (AUD)
                <input className={`${inputClass} mt-1`} inputMode="decimal" value={r.amount} onChange={(e) => update(r.key, { amount: e.target.value })} placeholder="0.00" />
              </label>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 text-xs font-semibold">
                Evidence reference (optional)
                <input className={`${inputClass} mt-1`} value={r.evidenceNote} maxLength={200} onChange={(e) => update(r.key, { evidenceNote: e.target.value })} placeholder="e.g. Exit condition report, photo 4" />
              </label>
              <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="rounded-full px-3 py-2 text-sm font-semibold text-[#9b3a22] hover:bg-[#fbe3dc]">
                Remove
              </button>
            </div>
          </fieldset>
        ))}
        <button type="button" onClick={() => setRows((rs) => [...rs, toRow()])} className="rounded-full border border-dashed border-[#0b4f43] px-4 py-2 text-sm font-semibold text-[#0b4f43] hover:bg-[#f1f6f6]">
          + Add deduction
        </button>
      </div>

      <label className="mt-5 block text-xs font-semibold">
        Note to the other party (optional)
        <textarea className={`${inputClass} mt-1`} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-[#f1f6f6] p-4 text-sm">
        <div>
          <p className="text-[#5f6b76]">Bond</p>
          <p className="font-bold">{formatMoney(bondAmountCents)}</p>
        </div>
        <div>
          <p className="text-[#5f6b76]">Deductions</p>
          <p className="font-bold">{formatMoney(totalDeductions)}</p>
        </div>
        <div>
          <p className="text-[#5f6b76]">To renter</p>
          <p className={`font-bold ${refund < 0 ? "text-[#9b3a22]" : "text-[#0b4f43]"}`}>{formatMoney(refund)}</p>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-[#fbe3dc] p-3 text-sm text-[#9b3a22]">{error}</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        <MotionButton type="submit" variant="primary" icon={<SendIcon />} disabled={submitting}>
          {submitting ? "Sending…" : submitLabel}
        </MotionButton>
        {onCancel && (
          <MotionButton variant="outline" onClick={onCancel}>
            Cancel
          </MotionButton>
        )}
      </div>
    </form>
  );
}
