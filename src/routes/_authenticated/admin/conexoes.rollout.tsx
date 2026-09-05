import { createFileRoute } from "@tanstack/react-router";
import { adminTitle } from "@/lib/brand";
import { HomologationRolloutDashboard } from "@/components/lots/platform-hub/HomologationRolloutDashboard";

export const Route = createFileRoute("/_authenticated/admin/conexoes/rollout")({
  head: () => ({ meta: [{ title: adminTitle("Rollout Homologação") }] }),
  component: RolloutPage,
});

function RolloutPage() {
  return <HomologationRolloutDashboard />;
}
