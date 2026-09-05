import { ArrowDown } from "lucide-react";
import type { PlanoOportunidade } from "@/lib/strategic-plan/types";
import { platformLabel } from "@/lib/strategic-plan/oportunidades";
import { SectionCard } from "@/components/lots/SectionCard";

export function OportunidadesSection({ oportunidades }: { oportunidades: PlanoOportunidade[] }) {
  const active = oportunidades.filter((o) => o.status !== "concluido" && o.status !== "cancelado");

  return (
    <SectionCard
      eyebrow="Crescimento"
      title="Oportunidades"
      description="Insights manuais e sugestões automáticas por plataforma."
    >
      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma oportunidade identificada.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {active.map((o) => (
            <article key={o.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-primary">
                  {platformLabel(o.platform_key)}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {o.origem}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{o.insight}</p>
              <ArrowDown className="my-2 h-4 w-4 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{o.acao_sugerida}</p>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
