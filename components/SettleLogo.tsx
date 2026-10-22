import Link from "next/link";

/** Settle wordmark with a simple loop mark. */
export function SettleLogo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1.5 text-[#0b4f43]" aria-label="Settle home">
      <svg viewBox="0 0 32 32" width="30" height="30" fill="none" aria-hidden className="transition-transform duration-500 group-hover:rotate-[20deg]">
        <circle cx="16" cy="17" r="11" stroke="currentColor" strokeWidth="3" />
        <path d="M16 28c0-8 2-14 9-20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="16" cy="17" r="3.5" fill="currentColor" />
      </svg>
      <span className="logo-type text-[1.75rem] leading-none">settle</span>
    </Link>
  );
}
