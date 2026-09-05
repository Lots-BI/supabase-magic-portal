import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "@/components/lots/SectionCard";
import {
  OBJETIVO_FASE_LABEL,
  objetivoMatchesTab,
  type ObjetivoHistoricoTab,
  type ObjetivoWorkflowFase,
} from "@/lib/strategic-plan/objetivo-workflow";
import type { StrategicDashboardPayload } from "@/lib/strategic-plan/types";
import { cn } from "@/lib/utils";

const TABS: { id: ObjetivoHistoricoTab; label: string }[] = [
  { id: "ativos", label: "Objetivos ativos" },
  { id: "concluidos", label: "Concluídos" },
  { id: "cancelados", label: "Cancelados" },
];

export function ObjetivosHistoricoSection({
  objetivos,
}: {
  objetivos: StrategicDashboardPayload["objetivos"];
}) {
  const [tab, setTab] = useState<ObjetivoHistoricoTab>("ativos");
  const filtered = objetivos.filter((o) => objetivoMatchesTab(o.fase as ObjetivoWorkflowFase, tab));

  return (
    <SectionCard
      eyebrow="Histórico"
      title="Objetivos estratégicos"
      description="Cada objetivo concluído permanece no histórico do plano contínuo."
    >
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-muted/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {tab === "ativos"
            ? "Nenhum objetivo ativo no momento."
            : tab === "concluidos"
              ? "Nenhum objetivo concluído ainda."
              : "Nenhum objetivo cancelado."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <article key={o.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{o.titulo}</h3>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {OBJETIVO_FASE_LABEL[o.fase as ObjetivoWorkflowFase] ?? o.fase}
                </span>
              </div>
              {o.descricao && <p className="mt-1 text-xs text-muted-foreground">{o.descricao}</p>}
              {o.progressPct != null && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Progresso</span>
                    <span>{o.progressPct}%</span>
                  </div>
                  <Progress value={o.progressPct} className="h-1.5" />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
