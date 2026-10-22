import type { Metadata } from "next";
import { AppShell } from "../../components/AppShell";
import { MotionButton } from "../../components/MotionButton";

export const metadata: Metadata = {
  title: "Victoria bond dispute guidance | Settle",
  description: "General information about Victoria's official rental bond dispute pathways. Not legal advice.",
};

const steps = [
  {
    tag: "Step 1",
    title: "Try to agree",
    body: "Most bonds are settled by agreement. Compare the entry and exit condition reports, share evidence and agree how the bond is divided. In Victoria, a bond claim form must show how the bond is divided before a renter signs it.",
    note: "Settle can help you record and approve the same terms. It does not lodge anything with RTBA.",
  },
  {
    tag: "Step 2",
    title: "Claim through RTBA",
    body: "The Residential Tenancies Bond Authority (RTBA) holds the bond and repays it. If both parties agree, a jointly signed claim is the fastest route. A renter can also start a claim without the landlord's signature. RTBA then notifies the landlord, who has a short window (generally 14 days) to contest it.",
    note: "Check RTBA's current guidance for exactly what stops a renter-initiated claim.",
  },
  {
    tag: "Step 3",
    title: "Get information from CAV",
    body: "Consumer Affairs Victoria (CAV) publishes information about bond claims, deductions and your rights and obligations as a renter or rental provider (landlord).",
  },
  {
    tag: "Step 4",
    title: "Ask RDRV for help",
    body: "Rental Dispute Resolution Victoria (RDRV) is a free dispute resolution service provided by VCAT. A Resolution Coordinator contacts both parties and helps them try to reach an agreement. Applications go through the myRDRV portal.",
  },
  {
    tag: "Step 5",
    title: "VCAT decides",
    body: "If the dispute is not resolved, the Victorian Civil and Administrative Tribunal (VCAT) can hold a hearing and make a binding order about how the bond is paid out. RTBA pays out according to that order.",
  },
];

const sources = [
  { name: "Consumer Affairs Victoria: resolving bond issues and disputes", href: "https://www.consumer.vic.gov.au/bonddisputes" },
  { name: "Consumer Affairs Victoria: bond claims and refunds (RTBA)", href: "https://www.consumer.vic.gov.au/bondclaims" },
  { name: "Rental Dispute Resolution Victoria: bond disputes", href: "https://www.rdrv.vic.gov.au/resolve-dispute/bond" },
  { name: "VCAT", href: "https://www.vcat.vic.gov.au/" },
  { name: "Tenants Victoria: disputing bond and compensation claims", href: "https://tenantsvic.org.au/explore-topics/issues-with-your-landlord/disputing-bond-and-compensation-claims/" },
];

export default function DisputeGuidancePage() {
  return (
    <AppShell crumbs={[{ label: "Dispute guidance" }]}>
      <div role="note" className="mx-auto mb-6 max-w-[1400px] rounded-2xl border border-[#f1dfae] bg-[#fff6e0] px-4 py-3 text-xs leading-5 text-[#6b4f14]">
        <strong>General information, not legal advice.</strong> Settle is a prototype with no partnership with, or integration into,
        RTBA, Consumer Affairs Victoria, RDRV or VCAT. Rules and timeframes change, so always check the official websites.
      </div>

      <div className="fade-up mx-auto max-w-[1400px] rounded-[1.75rem] border border-[#e6e9ec] bg-white p-5 shadow-sm sm:p-8 lg:p-10">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0b4f43]">Victoria dispute pathways</p>
        <h1 className="display mt-3 max-w-3xl text-4xl leading-none sm:text-5xl">When you can&apos;t agree on the bond.</h1>
        <p className="mt-4 max-w-2xl leading-7 text-[#5f6b76]">
          A dispute recorded in Settle is a note between you and the other party. It is not an official application. These are the official
          pathways in Victoria, roughly in the order people use them.
        </p>

        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.tag}
              style={{ animationDelay: `${100 + i * 70}ms` }}
              className="fade-up flex flex-col rounded-2xl border border-[#e6e9ec] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#0b4f43]/30 hover:shadow-[0_14px_30px_rgba(11,79,67,.10)]"
            >
              <span className="text-xs font-bold uppercase tracking-[.16em] text-[#0b4f43]">{s.tag}</span>
              <h2 className="mt-3 text-xl font-bold">{s.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#455249]">{s.body}</p>
              {s.note && <p className="mt-4 rounded-lg bg-[#f1f6f6] p-3 text-xs leading-5 text-[#5f6b76]">{s.note}</p>}
            </li>
          ))}
        </ol>

        <section className="mt-12 grid gap-6 rounded-2xl bg-[#1b2733] p-6 text-[#f5f6f8] sm:p-10 lg:grid-cols-2">
          <div>
            <h2 className="display text-3xl">RTBA stays the bond authority.</h2>
            <p className="mt-3 leading-7 text-[#b9c8bd]">
              An approval in Settle does not release money. Only RTBA repays bonds, based on a valid claim or a VCAT order. Settle never
              replaces or blocks your right to make a claim directly with RTBA.
            </p>
          </div>
          <ul className="space-y-3 text-sm leading-6 text-[#def3f1]">
            <li>✓ Keep your entry and exit condition reports, photos, receipts and quotes.</li>
            <li>✓ Agree on exact amounts in writing before signing any claim form.</li>
            <li>✓ Watch RTBA notices closely, because contest windows are short.</li>
            <li>✓ Free help is available from Tenants Victoria and CAV.</li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-bold">Official and community sources</h2>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {sources.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0b4f43] underline underline-offset-2">
                  {s.name} ↗
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-[#5f6b76]">Information checked October 2026.</p>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <MotionButton variant="primary" href="/renter">
            Renter dashboard
          </MotionButton>
          <MotionButton variant="soft" href="/landlord">
            Landlord dashboard
          </MotionButton>
        </div>
      </div>
    </AppShell>
  );
}
