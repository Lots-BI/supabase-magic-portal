import { Progress } from "@/components/ui/progress";
import type { StrategicDashboardPayload } from "@/lib/strategic-plan/types";
import { SectionCard } from "@/components/lots/SectionCard";

export function ObjetivosSection({
  objetivos,
}: {
  objetivos: StrategicDashboardPayload["objetivos"];
}) {
  const active = objetivos.filter((o) => o.status !== "concluido" && o.status !== "cancelado");

  return (
    <SectionCard
      eyebrow="Direção"
      title="Objetivos ativos"
      description="Metas, KPIs e estratégias vinculadas."
    >
      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum objetivo ativo.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((o) => (
            <article key={o.id} className="rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">{o.titulo}</h3>
              {o.descricao && <p className="mt-1 text-xs text-muted-foreground">{o.descricao}</p>}
              {o.progressPct != null && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium text-foreground">{o.progressPct}%</span>
                  </div>
                  <Progress value={o.progressPct} className="h-1.5" />
                </div>
              )}
              {o.estrategias.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Estratégias
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {o.estrategias.map((s) => (
                      <span
                        key={s.id}
                        className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-foreground"
                      >
                        {s.titulo}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {o.metricProgress.length > 0 && (
                <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                  {o.metricProgress.map((m) => (
                    <li key={m.ref.id}>
                      {m.platformLabel} · {m.label}:{" "}
                      <span className={m.onTrack ? "text-[color:var(--success)]" : "text-warning"}>
                        {m.pct != null ? `${Math.round(m.pct)}% da meta` : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
