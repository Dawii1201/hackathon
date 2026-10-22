import type { Metadata } from "next";
import { AppShell } from "../../components/AppShell";
import { Dashboard } from "../../components/Dashboard";
import { SimulationBanner } from "../../components/SimulationBanner";

export const metadata: Metadata = { title: "Renter dashboard | Settle" };

export default function RenterDashboardPage() {
  return (
    <AppShell role="renter" crumbs={[{ label: "Dashboard" }]}>
      <SimulationBanner role="renter" />
      <Dashboard role="renter" />
    </AppShell>
  );
}
