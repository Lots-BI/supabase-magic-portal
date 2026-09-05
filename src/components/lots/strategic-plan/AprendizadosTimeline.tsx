import type { PlanoAprendizado } from "@/lib/strategic-plan/types";
import { SectionCard } from "@/components/lots/SectionCard";

function monthLabel(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function AprendizadosTimeline({ aprendizados }: { aprendizados: PlanoAprendizado[] }) {
  const byMonth = new Map<string, PlanoAprendizado[]>();
  for (const a of aprendizados) {
    const key = a.mes_referencia.slice(0, 7);
    const arr = byMonth.get(key) ?? [];
    arr.push(a);
    byMonth.set(key, arr);
  }

  const months = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <SectionCard
      eyebrow="Conhecimento acumulado"
      title="Aprendizados"
      description="O que funcionou — e o que não funcionou — mês a mês."
    >
      {months.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum aprendizado registrado.</p>
      ) : (
        <div className="space-y-6">
          {months.map(([key, items]) => (
            <div key={key}>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary capitalize">
                {monthLabel(items[0].mes_referencia)}
              </p>
              <ul className="mt-2 space-y-2 border-l border-border pl-4">
                {items.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[21px] top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                    <p className="text-sm font-medium text-foreground">{a.titulo}</p>
                    {a.descricao && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.descricao}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
