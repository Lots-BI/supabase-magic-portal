import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Compass, ArrowRight } from "lucide-react";
import { listPlanos } from "@/lib/strategic-plan.functions";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { EmptyState } from "@/components/lots/EmptyState";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { brandTitle } from "@/lib/brand";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/_authenticated/plano-estrategico")({
  head: () => ({ meta: [{ title: brandTitle("Plano Estratégico") }] }),
  component: PlanoHubPage,
});

function PlanoHubPage() {
  const listFn = useServerFn(listPlanos);
  const { data, isLoading } = useQuery({
    queryKey: ["strategic-plan", "hub"],
    queryFn: () => listFn({ data: { status: "ativo" } }),
    staleTime: 5 * 60 * 1000,
  });

  const planos = data ?? [];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Centro Estratégico"
        title="Planos Estratégicos"
        description="Um plano contínuo por cliente — abra para ver o objetivo atual e o histórico."
      />

      {isLoading ? (
        <DashboardSkeleton kpiCount={0} withChart={false} />
      ) : planos.length === 0 ? (
        <SectionCard title="Nenhum plano ativo">
          <EmptyState
            icon={Compass}
            title="Sem planos estratégicos ativos"
            description="A agência cria um plano por cliente no painel admin. Depois, a evolução é por objetivos."
          />
        </SectionCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {planos.map((p) => (
            <Link
              key={p.id}
              to="/cliente/$cliente/plano-estrategico/$planoId"
              params={{ cliente: slugify(p.cliente_nome), planoId: p.id }}
              className="lots-surface group flex flex-col gap-2 p-5 transition-colors hover:border-primary/30"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {p.cliente_nome}
              </p>
              <h2 className="font-display text-lg font-semibold text-foreground">{p.titulo}</h2>
              <p className="text-xs text-muted-foreground">
                Plano contínuo · evolução por objetivos
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary">
                Abrir plano <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
