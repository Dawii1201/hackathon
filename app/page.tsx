import Link from "next/link";
import { ArrowUpRightIcon } from "../components/icons";
import { MotionButton } from "../components/MotionButton";
import { SettleLogo } from "../components/SettleLogo";

const principles = [
  { number: "01", title: "One exact settlement", text: "The bond, recipient, amount, agreement version and transaction ID travel together as one release payload." },
  { number: "02", title: "Two people approve", text: "A normal mutual settlement needs matching renter and landlord approval evidence before it can proceed." },
  { number: "03", title: "Evidence stays visible", text: "Every decision can be reviewed against the proposal and its evidence, with disputes kept in view." },
];

export default function Home() {
  return (
    <main>
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 lg:px-10">
        <SettleLogo href="#top" />
        <div className="hidden items-center gap-8 text-sm text-[#5f6b76] md:flex"><a href="#how-it-works">How it works</a><a href="#security">Security</a><Link href="/dispute-guidance">Dispute guidance</Link></div>
        <div className="flex gap-2"><MotionButton variant="primary" href="/renter">Renter demo</MotionButton><MotionButton variant="soft" href="/landlord">Landlord demo</MotionButton></div>
      </nav>

      <section id="top" className="mx-auto grid max-w-7xl gap-14 px-6 pb-24 pt-14 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pt-20">
        <div>
          <p className="mb-7 inline-flex items-center gap-2 rounded-full bg-[#def3f1] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#0b4f43]"><span className="h-2 w-2 rounded-full bg-[#0b4f43]" />Victoria bond prototype</p>
          <h1 className="display max-w-3xl text-6xl leading-[.94] sm:text-7xl lg:text-[6.6rem]">A fairer way to agree what happens next.</h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-[#5f6b76]">Settle helps renters and landlords make a rental bond settlement clear, evidence-backed and agreed by both sides.</p>
          <div className="mt-10 flex flex-wrap gap-3"><MotionButton variant="primary" size="lg" href="#how-it-works" icon={<ArrowUpRightIcon />}>See the settlement model</MotionButton><MotionButton variant="outline" size="lg" href="#security">Read the security promise</MotionButton></div>
          <p className="mt-8 text-xs leading-5 text-[#5f6b76]">Prototype only · no money movement · no government integration</p>
        </div>

        <div className="grid-paper relative overflow-hidden rounded-[2rem] border border-[#e6e9ec] p-5 shadow-[0_25px_80px_rgba(28,107,76,.08)] sm:p-8">
          <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[#f3c96b]/60 blur-2xl" />
          <div className="relative rounded-2xl bg-white p-6 shadow-xl shadow-[#0b4f43]/10 sm:p-8">
            <div className="flex items-start justify-between border-b border-[#e5ebe5] pb-6"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#5f6b76]">Settlement proposal</p><h2 className="display mt-2 text-3xl">Bond #TR-2048</h2></div><span className="rounded-full bg-[#fff4d8] px-3 py-1 text-xs font-bold text-[#8a651d]">In review</span></div>
            <div className="grid grid-cols-2 gap-5 py-7 text-sm"><div><p className="text-[#5f6b76]">Proposed return</p><p className="mt-1 text-2xl font-bold">$1,840.00</p></div><div><p className="text-[#5f6b76]">Evidence items</p><p className="mt-1 text-2xl font-bold">03 files</p></div></div>
            <div className="rounded-xl bg-[#f1f6f6] p-4 text-sm"><div className="flex items-center justify-between"><span className="font-semibold">Shared approval</span><span className="text-[#0b4f43]">0 of 2</span></div><div className="mt-3 h-2 rounded-full bg-[#e6e9ec]"><div className="h-2 w-1/2 rounded-full bg-[#0b4f43]" /></div><p className="mt-3 text-xs leading-5 text-[#5f6b76]">The release is only ready when both parties approve the same settlement details.</p></div>
            <div className="mt-7 flex items-center justify-between text-xs text-[#5f6b76]"><span>Agreement v3 · TX-7F2A</span><span className="font-semibold text-[#0b4f43]">View evidence →</span></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[#e6e9ec] bg-white"><div className="mx-auto max-w-7xl px-6 py-20 lg:px-10"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.18em] text-[#0b4f43]">The simple idea</p><h2 className="display mt-4 text-5xl leading-none sm:text-6xl">Make the agreement the thing that matters.</h2></div><div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[#e6e9ec] bg-[#e6e9ec] md:grid-cols-3">{principles.map((item) => <article key={item.number} className="bg-white p-7"><span className="text-sm font-bold text-[#0b4f43]">{item.number}</span><h3 className="mt-12 text-xl font-bold">{item.title}</h3><p className="mt-3 leading-7 text-[#5f6b76]">{item.text}</p></article>)}</div></div></section>

      <section id="security" className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[.7fr_1.3fr] lg:px-10"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-[#0b4f43]">Security, explained plainly</p><h2 className="display mt-4 text-5xl leading-none">Identity is not the same as authority.</h2></div><div className="rounded-2xl bg-[#1b2733] p-8 text-[#f5f6f8] sm:p-10"><p className="max-w-2xl text-xl leading-9 text-[#def3f1]">TideCloak can protect who is signing in and whether a protected request comes from the authenticated browser. A custom Forseti policy is what must protect the exact bond release payload and require both parties.</p><div className="mt-10 grid gap-4 border-t border-white/15 pt-6 text-sm sm:grid-cols-2"><div><p className="font-bold text-[#f3c96b]">Tide-protected boundary</p><p className="mt-2 leading-6 text-[#b9c8bd]">Authentication, roles, sessions, token verification and DPoP when configured.</p></div><div><p className="font-bold text-[#f3c96b]">Build next</p><p className="mt-2 leading-6 text-[#b9c8bd]">A real Forseti policy for exact payload binding, distinct approvals and replay resistance.</p></div></div></div></section>

      <section id="boundary" className="border-t border-[#e6e9ec] bg-[#fffaf0]"><div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:px-10"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.18em] text-[#8a651d]">A clear prototype boundary</p><h2 className="display mt-3 text-4xl">Settle does not replace Victoria&apos;s official process.</h2><p className="mt-4 leading-7 text-[#5f6b76]">This concept has no partnership or integration with RTBA, Consumer Affairs Victoria, RDRV or VCAT. Lawful renter-initiated RTBA claims and formal order pathways remain separate.</p></div><a href="#top" className="shrink-0 rounded-full border border-[#d8c894] px-5 py-3 text-sm font-bold">Back to top ↑</a></div></section>
      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-xs text-[#5f6b76] sm:flex-row sm:items-center sm:justify-between lg:px-10"><span>© 2026 Settle prototype</span><span>Built for Tide UNLOCKED · Challenge 2</span></footer>
    </main>
  );
}
