import type { Metadata } from "next";
import { AppShell } from "../../../../components/AppShell";
import { BondWorkspace } from "../../../../components/BondWorkspace";
import { SimulationBanner } from "../../../../components/SimulationBanner";

export const metadata: Metadata = { title: "Bond settlement | Settle" };

export default async function LandlordBondPage({ params }: { params: Promise<{ bondId: string }> }) {
  const bondId = decodeURIComponent((await params).bondId);
  return (
    <AppShell role="landlord" crumbs={[{ label: "Dashboard", href: "/landlord" }, { label: `Bond ${bondId}` }]}>
      <SimulationBanner role="landlord" />
      <BondWorkspace role="landlord" bondId={bondId} />
    </AppShell>
  );
}
