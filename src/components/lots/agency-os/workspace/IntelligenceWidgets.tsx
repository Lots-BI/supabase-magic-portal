import { Suspense } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ClientHealthBadge } from "../ClientHealthBadge";
import { WorkspaceWidgetShell, WidgetSkeleton } from "./WorkspaceWidgetShell";
import { getClientIntelligence } from "@/modules/agency-os/agency-os.server";
import { agencyOsKeys } from "@/modules/agency-os/query-keys";

const intelligenceQuery = (clientId: number) =>
  queryOptions({
    queryKey: agencyOsKeys.clientIntelligence(clientId),
    queryFn: () => getClientIntelligence({ data: { id: clientId } }),
  });

export function HealthDiagnosisWidget({ clientId }: { clientId: number }) {
  return (
    <Suspense
      fallback={
        <WorkspaceWidgetShell title="Health" description="Diagnóstico operacional">
          <WidgetSkeleton rows={4} />
        </WorkspaceWidgetShell>
      }
    >
      <HealthDiagnosisContent clientId={clientId} />
    </Suspense>
  );
}

function HealthDiagnosisContent({ clientId }: { clientId: number }) {
  const { data } = useSuspenseQuery(intelligenceQuery(clientId));
  const { health } = data;

  return (
    <WorkspaceWidgetShell
      title="Health"
      description={`Score ${health.score} · diagnóstico automático`}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="font-display text-3xl font-semibold tabular-nums text-foreground">
            {health.score}
          </span>
          <ClientHealthBadge tier={health.tier} />
        </div>

        {health.reasons.length > 0 && (
          <div>
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              Motivos
            </p>
            <ul className="space-y-1.5">
              {health.reasons.map((r) => (
                <li key={r.id} className="flex items-start gap-2 text-sm text-foreground">
                  <span
                    className={
                      r.impact === "positive"
                        ? "text-[color:var(--success)]"
                        : r.impact === "negative"
                          ? "text-[color:var(--danger)]"
                          : "text-muted-foreground"
                    }
                    aria-hidden
                  >
                    {r.impact === "positive" ? "+" : r.impact === "negative" ? "−" : "·"}
                  </span>
                  {r.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {health.suggestedNextAction && (
          <p className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
            <span className="font-medium text-muted-foreground">Próxima ação · </span>
            {health.suggestedNextAction}
          </p>
        )}
      </div>
    </WorkspaceWidgetShell>
  );
}

export function InsightsWidget({ clientId }: { clientId: number }) {
  return (
    <Suspense
      fallback={
        <WorkspaceWidgetShell title="Insights" description="Sinais automáticos">
          <WidgetSkeleton />
        </WorkspaceWidgetShell>
      }
    >
      <InsightsContent clientId={clientId} />
    </Suspense>
  );
}

function InsightsContent({ clientId }: { clientId: number }) {
  const { data } = useSuspenseQuery(intelligenceQuery(clientId));

  return (
    <WorkspaceWidgetShell title="Insights" description={`${data.insights.length} sinal(is)`}>
      {data.insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum insight relevante no momento.</p>
      ) : (
        <ul className="space-y-3">
          {data.insights.map((insight) => (
            <li
              key={insight.id}
              className="rounded-lg border border-border bg-muted/20 px-3 py-2.5"
            >
              <p className="text-sm font-medium text-foreground">{insight.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{insight.description}</p>
            </li>
          ))}
        </ul>
      )}
    </WorkspaceWidgetShell>
  );
}

export function RecommendationsWidget({ clientId }: { clientId: number }) {
  return (
    <Suspense
      fallback={
        <WorkspaceWidgetShell title="Recomendações" description="Ações sugeridas">
          <WidgetSkeleton />
        </WorkspaceWidgetShell>
      }
    >
      <RecommendationsContent clientId={clientId} />
    </Suspense>
  );
}

function RecommendationsContent({ clientId }: { clientId: number }) {
  const { data } = useSuspenseQuery(intelligenceQuery(clientId));

  return (
    <WorkspaceWidgetShell title="Recomendações" description="Geradas automaticamente">
      {data.recommendations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Operação em dia — sem ações urgentes.</p>
      ) : (
        <ul className="space-y-2">
          {data.recommendations.map((rec) => (
            <li key={rec.id}>
              <Link
                to={rec.actionHref ?? `/admin/central/clientes/${clientId}`}
                className="lots-focus block rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/40"
              >
                <p className="text-sm font-medium text-foreground">{rec.title}</p>
                <p className="text-xs text-muted-foreground">{rec.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WorkspaceWidgetShell>
  );
}

export function PerformanceWidget({ clientId }: { clientId: number }) {
  return (
    <Suspense
      fallback={
        <WorkspaceWidgetShell title="Performance" description="Últimos 30 dias">
          <WidgetSkeleton rows={2} />
        </WorkspaceWidgetShell>
      }
    >
      <PerformanceContent clientId={clientId} />
    </Suspense>
  );
}

function PerformanceContent({ clientId }: { clientId: number }) {
  const { data } = useSuspenseQuery(intelligenceQuery(clientId));
  const perf = data.performance;

  return (
    <WorkspaceWidgetShell title="Performance" description="Últimos 30 dias">
      {!perf ? (
        <p className="text-sm text-muted-foreground">
          Sem métricas consolidadas para este cliente.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Metric label="Investimento" value={formatCurrency(perf.spend30d)} />
          <Metric label="Sessões" value={perf.sessions30d.toLocaleString("pt-BR")} />
          <Metric label="Conversões" value={perf.leads30d.toLocaleString("pt-BR")} />
          {perf.trendLabel && (
            <div className="col-span-2 text-xs text-muted-foreground">{perf.trendLabel}</div>
          )}
        </div>
      )}
    </WorkspaceWidgetShell>
  );
}

export function FinanceWidget({ clientId }: { clientId: number }) {
  return (
    <Suspense
      fallback={
        <WorkspaceWidgetShell title="Financeiro" description="Resumo">
          <WidgetSkeleton rows={1} />
        </WorkspaceWidgetShell>
      }
    >
      <FinanceContent clientId={clientId} />
    </Suspense>
  );
}

function FinanceContent({ clientId }: { clientId: number }) {
  const { data } = useSuspenseQuery(intelligenceQuery(clientId));
  const fin = data.financeSummary;

  return (
    <WorkspaceWidgetShell title="Financeiro" description="Resumo operacional">
      {!fin ? (
        <p className="text-sm text-muted-foreground">Sem dados financeiros.</p>
      ) : (
        <div className="space-y-2">
          <Metric label="MRR" value={fin.mrr != null ? formatCurrency(fin.mrr) : "—"} />
          <p className="text-xs text-muted-foreground">{fin.statusLabel}</p>
        </div>
      )}
    </WorkspaceWidgetShell>
  );
}

export function CampaignsWidget({ clientId }: { clientId: number }) {
  return (
    <Suspense
      fallback={
        <WorkspaceWidgetShell title="Campanhas" description="Canais">
          <WidgetSkeleton rows={2} />
        </WorkspaceWidgetShell>
      }
    >
      <CampaignsContent clientId={clientId} />
    </Suspense>
  );
}

function CampaignsContent({ clientId }: { clientId: number }) {
  const { data } = useSuspenseQuery(intelligenceQuery(clientId));
  const camps = data.campaignsSummary;

  return (
    <WorkspaceWidgetShell title="Campanhas" description="Serviços de mídia">
      {!camps || camps.activeChannels.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum canal de mídia contratado.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {camps.activeChannels.map((ch) => (
            <li
              key={ch}
              className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {ch}
            </li>
          ))}
        </ul>
      )}
    </WorkspaceWidgetShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function formatCurrency(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
