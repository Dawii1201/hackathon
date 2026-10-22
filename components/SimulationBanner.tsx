import type { PartyRole } from "../lib/api/types";

/**
 * Shown on every workflow page. Keeps the prototype boundary visible: there is
 * no TideCloak sign-in on these pages yet, approvals are not cryptographically
 * protected, and no money moves.
 */
export function SimulationBanner({ role }: { role?: PartyRole }) {
  return (
    <div role="note" className="mx-auto mb-6 max-w-[1400px] rounded-2xl border border-[#f1dfae] bg-[#fff6e0] px-4 py-3 text-xs leading-5 text-[#6b4f14]">
      <strong className="font-bold">Simulation.</strong>{" "}
      {role ? `You are viewing a demo ${role} account without signing in. ` : ""}
      Approvals here are not Tide-protected or cryptographically signed, no money moves, and nothing is sent to RTBA, CAV, RDRV or VCAT.
    </div>
  );
}
