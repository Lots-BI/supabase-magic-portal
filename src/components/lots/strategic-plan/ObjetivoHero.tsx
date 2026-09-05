import { Progress } from "@/components/ui/progress";
import { SectionCard } from "@/components/lots/SectionCard";
import {
  OBJETIVO_FASE_LABEL,
  type ObjetivoWorkflowFase,
} from "@/lib/strategic-plan/objetivo-workflow";
import type { StrategicDashboardPayload } from "@/lib/strategic-plan/types";

type ObjetivoAtual = NonNullable<StrategicDashboardPayload["objetivoAtual"]>;

function formatPeriodo(o: ObjetivoAtual): string | null {
  const inicio = o.periodo_inicio ?? o.created_at.slice(0, 10);
  const fim = o.data_alvo;
  if (!inicio && !fim) return null;
  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
  if (inicio && fim) return `${fmt(inicio)} — ${fmt(fim)}`;
  if (fim) return `Até ${fmt(fim)}`;
  return `Desde ${fmt(inicio)}`;
}

export function ObjetivoHero({
  planoTitulo,
  objetivo,
}: {
  planoTitulo: string;
  objetivo: ObjetivoAtual | null;
}) {
  const periodo = objetivo ? formatPeriodo(objetivo) : null;
  const faseLabel = objetivo
    ? (OBJETIVO_FASE_LABEL[objetivo.fase as ObjetivoWorkflowFase] ?? objetivo.fase)
    : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          Plano Estratégico
        </p>
        <h2 className="mt-1 break-words font-display text-lg font-semibold text-foreground">
          {planoTitulo}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Documento vivo de longo prazo — a evolução acontece pelos objetivos.
        </p>
      </div>

      {objetivo ? (
        <SectionCard
          eyebrow="Objetivo atual"
          title={objetivo.titulo}
          description={objetivo.descricao ?? periodo ?? undefined}
          actions={
            faseLabel ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {faseLabel}
              </span>
            ) : null
          }
        >
          <div className="space-y-4">
            {objetivo.progressPct != null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Progresso do objetivo</span>
                  <span className="font-semibold text-foreground">{objetivo.progressPct}%</span>
                </div>
                <Progress value={objetivo.progressPct} className="h-2" />
              </div>
            )}

            {objetivo.proximaMeta && (
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Próxima meta
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {objetivo.proximaMeta.platformLabel} · {objetivo.proximaMeta.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {objetivo.proximaMeta.current != null
                    ? `Atual: ${objetivo.proximaMeta.current}`
                    : "Sem leitura no período"}
                  {objetivo.proximaMeta.meta != null ? ` · Meta: ${objetivo.proximaMeta.meta}` : ""}
                </p>
              </div>
            )}

            {objetivo.meta_numerica != null && (
              <p className="text-xs text-muted-foreground">
                Meta numérica do objetivo:{" "}
                <span className="font-medium text-foreground">{objetivo.meta_numerica}</span>
              </p>
            )}
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Nenhum objetivo em andamento">
          <p className="text-sm text-muted-foreground">
            Defina o próximo objetivo estratégico para dar continuidade ao planejamento.
          </p>
        </SectionCard>
      )}
    </div>
  );
}
