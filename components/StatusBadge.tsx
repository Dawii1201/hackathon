import type { SettlementStatus } from "../lib/api/types";

const styles: Record<SettlementStatus | "no-request", { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-[#fff4d8] text-[#8a651d]" },
  approved: { label: "Approved", className: "bg-[#def3f1] text-[#0b4f43]" },
  disputed: { label: "Disputed", className: "bg-[#fbe3dc] text-[#9b3a22]" },
  "no-request": { label: "No request yet", className: "bg-[#eef1ec] text-[#5f6b76]" },
};

export function StatusBadge({ status }: { status: SettlementStatus | "no-request" }) {
  const { label, className } = styles[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
