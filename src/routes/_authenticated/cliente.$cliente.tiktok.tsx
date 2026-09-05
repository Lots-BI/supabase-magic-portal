import { createFileRoute } from "@tanstack/react-router";
import { PlatformPlaceholder } from "@/components/lotus/PlatformPlaceholder";
import { Music2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/tiktok")({
  component: () => (
    <PlatformPlaceholder
      icon={Music2}
      title="TikTok"
      platformId="tiktok"
      description="Métricas de campanhas e conteúdo da conta TikTok."
    />
  ),
});
