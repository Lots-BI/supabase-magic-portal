import { createFileRoute } from "@tanstack/react-router";
import { PlatformDashboardPage } from "@/components/lots/PlatformDashboardPage";
import { googleAdsDef } from "@/lib/platforms/google-ads";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/google-ads")({
  component: () => <PlatformDashboardPage def={googleAdsDef} />,
});
