import { createFileRoute } from "@tanstack/react-router";
import { PlatformDashboardPage } from "@/components/lots/PlatformDashboardPage";
import { instagramDef } from "@/lib/platforms/instagram";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/instagram")({
  component: () => <PlatformDashboardPage def={instagramDef} />,
});
