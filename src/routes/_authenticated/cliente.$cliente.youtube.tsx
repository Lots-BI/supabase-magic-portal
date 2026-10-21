import { createFileRoute } from "@tanstack/react-router";
import { PlatformDashboardPage } from "@/components/lots/PlatformDashboardPage";
import { youtubeDef } from "@/lib/platforms/youtube";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/youtube")({
  component: () => <PlatformDashboardPage def={youtubeDef} />,
});
