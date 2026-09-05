import { createFileRoute } from "@tanstack/react-router";
import { PlatformDashboardPage } from "@/components/lots/PlatformDashboardPage";
import { ga4Def } from "@/lib/platforms/ga4";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/ga4")({
  component: () => <PlatformDashboardPage def={ga4Def} />,
});
