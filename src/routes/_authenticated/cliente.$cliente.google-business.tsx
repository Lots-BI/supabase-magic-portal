import { createFileRoute } from "@tanstack/react-router";
import { PlatformDashboardPage } from "@/components/lots/PlatformDashboardPage";
import { googleBusinessDef } from "@/lib/platforms/google-business";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/google-business")({
  component: () => <PlatformDashboardPage def={googleBusinessDef} />,
});
