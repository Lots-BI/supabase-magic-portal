import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { brandTitle } from "@/lib/brand";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { ClientOperationalReport } from "@/components/lots/operational-report/ClientOperationalReport";
import { clienteRefQuery } from "./cliente.$cliente";
import type { PeriodPreset } from "@/lib/period";

const PRESETS = [
  "today",
  "yesterday",
  "last_7",
  "last_30",
  "last_90",
  "this_month",
  "last_month",
  "custom",
] as const;

const searchSchema = z.object({
  preset: z.enum(PRESETS).optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/cliente/$cliente/relatorio")({
  head: ({ params }) => ({
    meta: [{ title: brandTitle(`Relatório — ${params.cliente}`) }],
  }),
  validateSearch: searchSchema,
  component: ClienteRelatorioPage,
});

function ClienteRelatorioPage() {
  const { cliente: slug } = Route.useParams();
  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={4} />}>
      <ClienteRelatorioResolved slug={slug} />
    </Suspense>
  );
}

function ClienteRelatorioResolved({ slug }: { slug: string }) {
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));
  const { preset } = Route.useSearch();

  if (!ref?.cadastroId) {
    return (
      <div className="lots-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }

  return (
    <ClientOperationalReport
      cadastroClienteId={ref.cadastroId}
      clienteNome={ref.nome}
      clienteSlug={slug}
      initialPreset={(preset as PeriodPreset | undefined) ?? "last_30"}
    />
  );
}
