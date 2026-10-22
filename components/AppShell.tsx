"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { getDemoParty, resetMockStore } from "../lib/api/mock-client";
import type { PartyRole } from "../lib/api/types";
import { BellIcon, BookIcon, ChevronRightIcon, CloseIcon, HomeIcon, LayoutIcon, MenuIcon, UserIcon } from "./icons";
import { SettleLogo } from "./SettleLogo";

export interface Crumb {
  label: string;
  href?: string;
}

const nav = [
  { href: "/renter", label: "Renter dashboard", icon: UserIcon },
  { href: "/landlord", label: "Landlord dashboard", icon: HomeIcon },
  { href: "/dispute-guidance", label: "Dispute guidance", icon: BookIcon },
  { href: "/", label: "About Settle", icon: LayoutIcon },
];

export function AppShell({ role, crumbs, children }: { role?: PartyRole; crumbs: Crumb[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const party = role ? getDemoParty(role) : null;
  const initials = party ? party.displayName.split(" ").map((w) => w[0]).join("") : "G";

  useEffect(() => setMenuOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  function resetDemo() {
    resetMockStore();
    window.location.reload();
  }

  const sidebar = (
    <nav aria-label="Main" className="flex h-full flex-col gap-1.5 p-5">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-2xl px-5 py-3.5 text-[15px] font-medium transition-all duration-200 ${
              active ? "bg-[#0b4f43] text-white shadow-md shadow-[#0b4f43]/20" : "text-[#1b2733] hover:translate-x-1 hover:bg-[#eef4f3] hover:text-[#0b4f43]"
            }`}
          >
            <Icon className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
            {label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={resetDemo}
        className="mt-2 rounded-2xl border border-[#d5dde0] px-5 py-3 text-left text-sm font-semibold text-[#1b2733] transition hover:border-[#0b4f43] hover:bg-[#eef4f3] hover:text-[#0b4f43]"
      >
        Reset demo state
      </button>
      <div className="mt-auto rounded-2xl bg-[#fff6e0] p-4 text-xs leading-5 text-[#6b4f14]">
        <p className="font-bold">Prototype</p>
        <p className="mt-1">Simulated data. No money moves and no RTBA, CAV, RDRV or VCAT integration.</p>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <header className="sticky top-0 z-30 border-b border-[#e6e9ec] bg-white/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:h-[4.5rem] sm:px-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-full p-2 text-[#1b2733] transition hover:bg-[#eef1f3] active:scale-90 lg:hidden"
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
            <SettleLogo />
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link href={role ? `/${role}#bonds` : "/renter"} className="wiggle relative rounded-full p-2 text-[#1b2733] transition hover:bg-[#eef1f3]" aria-label="Notifications">
              <BellIcon width={24} height={24} />
              <span className="pulse-dot absolute right-2 top-1.5 h-2 w-2 rounded-full bg-[#e5484d]" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-[15px] font-bold leading-tight">{party?.displayName ?? "Guest"}</p>
                <p className="text-xs capitalize text-[#5f6b76]">{role ? `Demo ${role}` : "Not signed in"}</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e4e9ee] text-sm font-semibold text-[#1b2733] ring-2 ring-white transition hover:scale-105">
                {initials}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-[4.5rem] hidden h-[calc(100vh-4.5rem)] w-72 shrink-0 border-r border-[#e6e9ec] bg-white lg:block">{sidebar}</aside>

        {menuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" className="absolute inset-0 bg-[#1b2733]/40" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
            <aside className="slide-in relative h-full w-72 max-w-[85vw] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#e6e9ec] px-5 py-4">
                <SettleLogo />
                <button type="button" onClick={() => setMenuOpen(false)} className="rounded-full p-2 transition hover:bg-[#eef1f3] active:scale-90" aria-label="Close menu">
                  <CloseIcon />
                </button>
              </div>
              <div className="h-[calc(100%-4.5rem)]">{sidebar}</div>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm">
            <Link href="/" className="text-[#5f6b76] transition hover:text-[#0b4f43]" aria-label="Home">
              <HomeIcon />
            </Link>
            {crumbs.map((c, i) => (
              <Fragment key={c.label}>
                <ChevronRightIcon width={16} height={16} className="text-[#9aa4ad]" />
                {c.href && i < crumbs.length - 1 ? (
                  <Link href={c.href} className="text-[#5f6b76] transition hover:text-[#0b4f43]">
                    {c.label}
                  </Link>
                ) : (
                  <span className="font-medium text-[#0b4f43]">{c.label}</span>
                )}
              </Fragment>
            ))}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}
