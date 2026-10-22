"use client";

import Link from "next/link";
import { useState } from "react";
import type { DisputePathway, RaiseDisputeInput } from "../lib/api/types";
import { disputePathwayLabels } from "../lib/format";
import { AlertIcon } from "./icons";
import { MotionButton } from "./MotionButton";

interface Props {
  onSubmit: (input: RaiseDisputeInput) => Promise<void>;
  onCancel: () => void;
}

export function DisputeForm({ onSubmit, onCancel }: Props) {
  const [reason, setReason] = useState("");
  const [pathway, setPathway] = useState<DisputePathway>("undecided");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please explain what you disagree with.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ reason: reason.trim(), intendedPathway: pathway });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#e5b8a9] bg-white p-5 sm:p-6">
      <h3 className="text-lg font-bold">Raise a dispute</h3>
      <p className="mt-1 text-sm leading-6 text-[#5f6b76]">
        This records your disagreement in Settle only. It does not lodge anything with RTBA, RDRV or VCAT. Read the{" "}
        <Link href="/dispute-guidance" className="font-semibold text-[#0b4f43] underline">
          Victoria dispute guidance
        </Link>{" "}
        for the official pathways.
      </p>
      <label className="mt-5 block text-xs font-semibold">
        What do you disagree with?
        <textarea
          className="mt-1 w-full rounded-lg border border-[#d5dde0] px-3 py-2 text-sm outline-none focus:border-[#0b4f43] focus:ring-2 focus:ring-[#0b4f43]/20"
          rows={3}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <fieldset className="mt-4">
        <legend className="text-xs font-semibold">What do you plan to do next?</legend>
        <div className="mt-2 grid gap-2">
          {(Object.keys(disputePathwayLabels) as DisputePathway[]).map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input type="radio" name="pathway" value={p} checked={pathway === p} onChange={() => setPathway(p)} className="accent-[#0b4f43]" />
              {disputePathwayLabels[p]}
            </label>
          ))}
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#fbe3dc] p-3 text-sm text-[#9b3a22]">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <MotionButton type="submit" variant="danger" icon={<AlertIcon />} disabled={submitting}>
          {submitting ? "Sending…" : "Record dispute"}
        </MotionButton>
        <MotionButton variant="outline" onClick={onCancel}>
          Cancel
        </MotionButton>
      </div>
    </form>
  );
}
