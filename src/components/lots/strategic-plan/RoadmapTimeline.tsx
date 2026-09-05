import { cn } from "@/lib/utils";
import type { PlanoRoadmapMarco } from "@/lib/strategic-plan/types";
import { SectionCard } from "@/components/lots/SectionCard";

export function RoadmapTimeline({ marcos }: { marcos: PlanoRoadmapMarco[] }) {
  const sorted = [...marcos].sort((a, b) => a.ordem - b.ordem);

  return (
    <SectionCard eyebrow="Execução" title="Roadmap" description="Marcos visuais do plano.">
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Roadmap ainda não definido.</p>
      ) : (
        <div className="lots-scroll-x pb-2">
          <ol className="flex min-w-max gap-0">
            {sorted.map((m, i) => (
              <li key={m.id} className="flex items-start">
                <div className="w-[min(10rem,42vw)] shrink-0 px-2 sm:w-40">
                  <div
                    className={cn(
                      "rounded-lg border p-3",
                      m.status === "concluido"
                        ? "border-[color:var(--success)]/40 bg-success/5"
                        : m.status === "em_andamento"
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-card",
                    )}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {m.tipo === "semana" && m.semana_numero
                        ? `Semana ${m.semana_numero}`
                        : m.tipo}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">{m.titulo}</p>
                    {m.descricao && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {m.descricao}
                      </p>
                    )}
                  </div>
                </div>
                {i < sorted.length - 1 && (
                  <div className="mt-8 h-px w-6 shrink-0 bg-border" aria-hidden />
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </SectionCard>
  );
}
