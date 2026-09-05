import { createFileRoute } from "@tanstack/react-router";
import { PlatformDashboardPage } from "@/components/lots/PlatformDashboardPage";
import { metaAdsDef } from "@/lib/platforms/meta-ads";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/meta-ads")({
  component: () => <PlatformDashboardPage def={metaAdsDef} />,
});
