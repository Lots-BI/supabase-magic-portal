import { ListChecks } from "lucide-react";
import type { ProximoPasso } from "@/lib/strategic-plan/types";
import { SectionCard } from "@/components/lots/SectionCard";

export function ProximosPassosBlock({ passos }: { passos: ProximoPasso[] }) {
  return (
    <SectionCard
      eyebrow="Ação imediata"
      title="Próximos Passos"
      description="Priorizados automaticamente a partir do plano e das métricas."
      className="border-primary/25 bg-gradient-to-t from-primary/[0.06] to-transparent"
    >
      {passos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum passo pendente identificado.</p>
      ) : (
        <ol className="space-y-2">
          {passos.map((p, i) => (
            <li
              key={`${p.origem}-${p.titulo}-${i}`}
              className="flex items-start gap-3 rounded-lg border border-border bg-card/80 px-3 py-2.5"
            >
              <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{p.titulo}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {p.origem}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
