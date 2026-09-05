import { cn } from "@/lib/utils";
import type { StrategicDashboardPayload } from "@/lib/strategic-plan/types";
import { SectionCard } from "@/components/lots/SectionCard";
import { StrategyEditorialStats } from "./StrategyEditorialStats";

export function EstrategiasSection({
  estrategias,
  isAdmin,
  objetivoTitulo,
}: {
  estrategias: StrategicDashboardPayload["estrategias"];
  isAdmin?: boolean;
  objetivoTitulo?: string;
}) {
  return (
    <SectionCard
      eyebrow="Execução"
      title="Estratégias do objetivo"
      description={
        objetivoTitulo
          ? `Linhas de atuação vinculadas a «${objetivoTitulo}».`
          : "Prioridade, peso relativo e conteúdos vinculados."
      }
    >
      {estrategias.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma estratégia definida.</p>
      ) : (
        <div className="space-y-4">
          {estrategias.map((e) => (
            <article key={e.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{e.titulo}</h3>
                  {e.descricao && (
                    <p className="mt-1 text-xs text-muted-foreground">{e.descricao}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    {Number(e.peso_percentual).toFixed(0)}% peso
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] uppercase",
                      e.prioridade === "alta"
                        ? "bg-destructive/10 text-destructive"
                        : e.prioridade === "media"
                          ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {e.prioridade}
                  </span>
                </div>
              </div>
              <StrategyEditorialStats
                stats={e.editorialStats}
                estrategiaId={e.id}
                adminLink={isAdmin}
              />
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
