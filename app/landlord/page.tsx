import type { Metadata } from "next";
import { AppShell } from "../../components/AppShell";
import { Dashboard } from "../../components/Dashboard";
import { SimulationBanner } from "../../components/SimulationBanner";

export const metadata: Metadata = { title: "Landlord dashboard | Settle" };

export default function LandlordDashboardPage() {
  return (
    <AppShell role="landlord" crumbs={[{ label: "Dashboard" }]}>
      <SimulationBanner role="landlord" />
      <Dashboard role="landlord" />
    </AppShell>
  );
}
