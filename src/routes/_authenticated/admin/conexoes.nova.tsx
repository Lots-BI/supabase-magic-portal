import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { adminTitle } from "@/lib/brand";
import { ConnectionWizardView } from "@/components/lots/platform-hub/ConnectionWizardView";

const searchSchema = z.object({
  plugin: z.string().optional(),
  connectionId: z.string().uuid().optional(),
  step: z.coerce.number().optional(),
});

export const Route = createFileRoute("/_authenticated/admin/conexoes/nova")({
  head: () => ({ meta: [{ title: adminTitle("Nova conexão") }] }),
  validateSearch: searchSchema,
  component: NovaConexaoPage,
});

function NovaConexaoPage() {
  const { plugin, connectionId, step } = Route.useSearch();
  return (
    <ConnectionWizardView
      initialPlugin={plugin}
      resumeConnectionId={connectionId}
      resumeStep={step}
    />
  );
}
