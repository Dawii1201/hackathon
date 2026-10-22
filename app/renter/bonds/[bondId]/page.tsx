import type { Metadata } from "next";
import { AppShell } from "../../../../components/AppShell";
import { BondWorkspace } from "../../../../components/BondWorkspace";
import { SimulationBanner } from "../../../../components/SimulationBanner";

export const metadata: Metadata = { title: "Bond settlement | Settle" };

export default async function RenterBondPage({ params }: { params: Promise<{ bondId: string }> }) {
  const bondId = decodeURIComponent((await params).bondId);
  return (
    <AppShell role="renter" crumbs={[{ label: "Dashboard", href: "/renter" }, { label: `Bond ${bondId}` }]}>
      <SimulationBanner role="renter" />
      <BondWorkspace role="renter" bondId={bondId} />
    </AppShell>
  );
}
