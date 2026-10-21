import { createFileRoute } from "@tanstack/react-router";
import { PlatformDashboardPage } from "@/components/lots/PlatformDashboardPage";
import { tiktokDef } from "@/lib/platforms/tiktok";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/tiktok")({
  component: () => <PlatformDashboardPage def={tiktokDef} />,
});
