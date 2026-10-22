"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getBondApi, type BondSummary, type PartyRole, type SettlementStatus } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";
import {
  AlertIcon,
  BookIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  FilterIcon,
  HomeIcon,
  MoreIcon,
  PlusCircleIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
} from "./icons";
import { MotionButton } from "./MotionButton";
import { StatusBadge } from "./StatusBadge";

type Filter = "all" | SettlementStatus | "no-request";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "disputed", label: "Disputed" },
  { value: "no-request", label: "No request" },
];

const statusTone: Record<BondSummary["status"], string> = {
  pending: "bg-[#fff1cc] text-[#8a651d]",
  approved: "bg-[#def3f1] text-[#0b4f43]",
  disputed: "bg-[#fdecea] text-[#a3341f]",
  "no-request": "bg-[#eef1f3] text-[#5f6b76]",
};

/** Animates a number from 0 to `target` (skipped for reduced motion). */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export function Dashboard({ role }: { role: PartyRole }) {
  const api = useMemo(() => getBondApi(role), [role]);
  const [bonds, setBonds] = useState<BondSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLElement>(null);

  useEffect(() => {
    api.listMyBonds().then(setBonds, (e: Error) => setError(e.message));
  }, [api]);

  // ⌘K / Ctrl+K focuses search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const list = bonds ?? [];
  const total = list.reduce((sum, b) => sum + b.bondAmountCents, 0);
  const animatedTotal = useCountUp(total);
  const awaiting = list.filter((b) => b.awaitingMyApproval);
  const noRequest = list.filter((b) => b.status === "no-request");
  const disputedCount = list.filter((b) => b.status === "disputed").length;

  const visible = list.filter((b) => {
    if (filter !== "all" && b.status !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || [b.bondId, b.propertyAddress, b.counterpartyName].some((v) => v.toLowerCase().includes(q));
  });

  const money = (cents: number | null) => (cents === null ? "—" : hidden ? "••••••" : formatMoney(cents));

  function showStatus(f: Filter) {
    setFilter(f);
    setShowFilters(true);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function exportCsv() {
    const rows = visible.filter((b) => selected.size === 0 || selected.has(b.bondId));
    const header = ["bondId", "status", "property", "counterparty", "bondAmount", "refundToRenter", "updatedAt"];
    const lines = rows.map((b) =>
      [b.bondId, b.status, b.propertyAddress, b.counterpartyName, (b.bondAmountCents / 100).toFixed(2), b.refundToRenterCents === null ? "" : (b.refundToRenterCents / 100).toFixed(2), b.updatedAt]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `settle-bonds-simulated.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  const allVisibleSelected = visible.length > 0 && visible.every((b) => selected.has(b.bondId));
  const toggleAll = () => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((b) => b.bondId)));
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const primaryHref = role === "renter" ? (noRequest[0] ? `/renter/bonds/${noRequest[0].bondId}` : undefined) : awaiting[0] ? `/landlord/bonds/${awaiting[0].bondId}` : undefined;

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      {error && <p className="rounded-2xl bg-[#fdecea] p-4 text-sm text-[#a3341f]">{error}</p>}

      {/* Account card */}
      <section className="fade-up rounded-[1.75rem] border border-[#e6e9ec] bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">{role === "renter" ? "Renter account" : "Landlord account"}</h1>
            <button
              type="button"
              onClick={() => setHidden((h) => !h)}
              className="rounded-full p-1.5 text-[#1b2733] transition hover:bg-[#eef1f3] active:scale-90"
              aria-label={hidden ? "Show amounts" : "Hide amounts"}
              aria-pressed={hidden}
            >
              {hidden ? <EyeOffIcon width={22} height={22} /> : <EyeIcon width={22} height={22} />}
            </button>
          </div>
          {role === "renter" ? (
            <MotionButton variant="soft" icon={<PlusCircleIcon />} href={primaryHref} disabled={!primaryHref} title={primaryHref ? undefined : "Every bond already has a request"}>
              New refund request
            </MotionButton>
          ) : (
            <MotionButton variant="soft" icon={<BookIcon />} href="/dispute-guidance">
              Dispute guidance
            </MotionButton>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#1b2733]">Total bonds held</p>
          <p className="mt-2 inline-flex items-center gap-2 text-4xl font-extrabold tracking-tight sm:text-5xl" aria-live="polite">
            {hidden ? "••••••" : formatMoney(animatedTotal)}
            <ChevronDownIcon width={18} height={18} className="text-[#5f6b76]" />
          </p>
          <p className="mt-2 text-xs text-[#5f6b76]">Simulated figures. Bonds are held by RTBA, not by Settle.</p>
        </div>

        {/* Bond cards */}
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {!bonds && !error &&
            [0, 1, 2].map((i) => <li key={i} className="h-44 animate-pulse rounded-2xl border border-[#e6e9ec] bg-[#f5f6f8]" />)}
          {list.map((b, i) => (
            <li key={b.bondId} className="fade-up" style={{ animationDelay: `${80 + i * 70}ms` }}>
              <Link
                href={`/${role}/bonds/${b.bondId}`}
                className="group relative block h-full overflow-hidden rounded-2xl border border-[#e6e9ec] bg-white p-5 shadow-[0_2px_10px_rgba(27,39,51,.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#0b4f43]/30 hover:shadow-[0_14px_30px_rgba(11,79,67,.12)]"
              >
                {/* Decorative loop mark, echoing the logo */}
                <svg viewBox="0 0 100 100" className="pointer-events-none absolute -right-8 -top-6 h-36 w-36 text-[#f1f3f5] transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" fill="none" aria-hidden>
                  <circle cx="50" cy="55" r="34" stroke="currentColor" strokeWidth="14" />
                </svg>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-full ${statusTone[b.status]}`}>
                      <HomeIcon width={18} height={18} />
                    </span>
                    <span className="text-lg font-semibold">{b.bondId}</span>
                  </div>
                  <MoreIcon className="text-[#5f6b76] transition group-hover:text-[#0b4f43]" />
                </div>
                <p className="relative mt-5 text-2xl font-extrabold tracking-tight">{money(b.bondAmountCents)}</p>
                <p className="relative mt-1 truncate text-sm text-[#5f6b76]">{b.propertyAddress}</p>
                <div className="relative mt-4 flex items-center justify-between gap-2">
                  <StatusBadge status={b.status} />
                  {b.awaitingMyApproval && <span className="text-xs font-bold text-[#8a651d]">Needs you</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {/* Action pills */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {role === "renter" ? (
            <MotionButton variant="primary" size="lg" icon={<PlusIcon />} href={primaryHref} disabled={!primaryHref}>
              Request refund
            </MotionButton>
          ) : (
            <MotionButton variant="primary" size="lg" icon={<CheckCircleIcon />} href={primaryHref} disabled={!primaryHref}>
              Review request
            </MotionButton>
          )}
          <MotionButton variant="soft" size="lg" icon={<CheckCircleIcon />} onClick={() => showStatus("pending")}>
            Approvals{awaiting.length > 0 && <span className="ml-1.5 rounded-full bg-[#0b4f43] px-2 py-0.5 text-xs text-white">{awaiting.length}</span>}
          </MotionButton>
          <MotionButton variant="soft" size="lg" icon={<AlertIcon />} onClick={() => showStatus("disputed")}>
            Disputes{disputedCount > 0 && <span className="ml-1.5 rounded-full bg-[#a3341f] px-2 py-0.5 text-xs text-white">{disputedCount}</span>}
          </MotionButton>
          <MotionButton variant="soft" size="lg" icon={<BookIcon />} href="/dispute-guidance">
            Guidance
          </MotionButton>
        </div>
      </section>

      {/* Bond table */}
      <section id="bonds" ref={tableRef} className="scroll-mt-24">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent bond activity</h2>
          <button
            type="button"
            onClick={() => {
              setFilter("all");
              setQuery("");
            }}
            className="text-sm font-medium text-[#0b4f43] underline-offset-4 transition hover:underline"
          >
            See all
          </button>
        </div>

        <div className="mt-4 rounded-[1.75rem] border border-[#e6e9ec] bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="relative flex flex-1 items-center md:max-w-md">
              <SearchIcon className="pointer-events-none absolute left-3.5 text-[#9aa4ad]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search here..."
                aria-label="Search bonds"
                className="w-full rounded-xl bg-[#f5f6f8] py-3 pl-11 pr-14 text-sm outline-none ring-[#0b4f43]/20 transition focus:bg-white focus:ring-4"
              />
              <kbd className="pointer-events-none absolute right-2.5 rounded-md bg-white px-2 py-1 text-xs text-[#5f6b76] shadow-sm">⌘ K</kbd>
            </label>
            <MotionButton variant="soft" icon={<FilterIcon />} onClick={() => setShowFilters((s) => !s)} className="rounded-xl md:self-stretch">
              Filter
            </MotionButton>
            <MotionButton variant="soft" icon={<SendIcon />} onClick={exportCsv} disabled={visible.length === 0} className="md:ml-auto">
              Export data{selected.size > 0 ? ` (${selected.size})` : ""}
            </MotionButton>
          </div>

          {showFilters && (
            <div role="group" aria-label="Filter by status" className="fade-up mt-4 flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={filter === f.value}
                  onClick={() => setFilter(f.value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 active:scale-95 ${
                    filter === f.value ? "bg-[#0b4f43] text-white shadow" : "bg-[#f5f6f8] text-[#5f6b76] hover:bg-[#def3f1] hover:text-[#0b4f43]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[#5f6b76]">
                <tr className="border-y border-[#eef1f3]">
                  <th className="w-10 py-3 pl-2">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all" className="h-4 w-4 accent-[#0b4f43]" />
                  </th>
                  <th className="py-3 pr-4 font-medium">Bond no.</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 font-medium">Time</th>
                  <th className="py-3 pr-4 font-medium">{role === "renter" ? "Landlord" : "Renter"}</th>
                  <th className="py-3 pr-4 font-medium">Property</th>
                  <th className="py-3 pr-4 font-medium">Refund to renter</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((b, i) => (
                  <tr key={b.bondId} className="fade-up border-b border-[#f1f3f5] transition-colors hover:bg-[#f7faf9]" style={{ animationDelay: `${i * 50}ms` }}>
                    <td className="py-4 pl-2">
                      <input type="checkbox" checked={selected.has(b.bondId)} onChange={() => toggleOne(b.bondId)} aria-label={`Select ${b.bondId}`} className="h-4 w-4 accent-[#0b4f43]" />
                    </td>
                    <td className="py-4 pr-4 font-medium">{b.bondId}</td>
                    <td className="py-4 pr-4"><StatusBadge status={b.status} /></td>
                    <td className="py-4 pr-4">{formatDate(b.updatedAt)}</td>
                    <td className="py-4 pr-4">{new Date(b.updatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false })}</td>
                    <td className="py-4 pr-4">{b.counterpartyName}</td>
                    <td className="max-w-[16rem] truncate py-4 pr-4">{b.propertyAddress}</td>
                    <td className="py-4 pr-4 font-medium">{money(b.refundToRenterCents)}</td>
                    <td className="py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/${role}/bonds/${b.bondId}`} aria-label={`View ${b.bondId}`} className="grid h-9 w-9 place-items-center rounded-full border border-[#e6e9ec] text-[#5f6b76] transition hover:-translate-y-0.5 hover:border-[#0b4f43] hover:text-[#0b4f43] active:scale-90">
                          <EyeIcon width={18} height={18} />
                        </Link>
                        <Link href={`/${role}/bonds/${b.bondId}`} aria-label={`More actions for ${b.bondId}`} className="grid h-9 w-9 place-items-center rounded-full border border-[#e6e9ec] text-[#5f6b76] transition hover:-translate-y-0.5 hover:border-[#0b4f43] hover:text-[#0b4f43] active:scale-90">
                          <MoreIcon width={18} height={18} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {bonds && visible.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-[#5f6b76]">
                      No bonds match your search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
