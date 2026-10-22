import type { DeductionCategory, DisputePathway } from "./api/types";

const aud = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });

export const formatMoney = (cents: number) => aud.format(cents / 100);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Parses "12.50" or "$1,200" into cents. Returns null for invalid input. */
export function parseMoneyToCents(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export const deductionCategoryLabels: Record<DeductionCategory, string> = {
  cleaning: "Cleaning",
  damage: "Damage",
  "unpaid-rent": "Unpaid rent",
  utilities: "Utilities",
  "keys-and-locks": "Keys & locks",
  other: "Other",
};

export const disputePathwayLabels: Record<DisputePathway, string> = {
  negotiate: "Keep negotiating in Settle",
  "cav-advice": "Get information from Consumer Affairs Victoria",
  rdrv: "Apply to Rental Dispute Resolution Victoria (RDRV)",
  vcat: "Apply to VCAT",
  undecided: "Not sure yet",
};
