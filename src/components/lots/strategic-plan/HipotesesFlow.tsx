import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanoHipotese } from "@/lib/strategic-plan/types";
import { SectionCard } from "@/components/lots/SectionCard";

const STATUS_LABEL: Record<PlanoHipotese["status"], string> = {
  aberta: "Aberta",
  em_teste: "Em teste",
  validada: "Validada",
  invalidada: "Invalidada",
};

const STATUS_CLASS: Record<PlanoHipotese["status"], string> = {
  aberta: "bg-muted text-muted-foreground",
  em_teste: "bg-warning/12 text-warning",
  validada: "bg-success/12 text-[color:var(--success)]",
  invalidada: "bg-destructive/12 text-destructive",
};

export function HipotesesFlow({ hipoteses }: { hipoteses: PlanoHipotese[] }) {
  return (
    <SectionCard
      eyebrow="Experimentação"
      title="Hipóteses"
      description="Testes de marketing com resultado e conclusão."
    >
      {hipoteses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma hipótese registrada.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {hipoteses.map((h) => (
            <article key={h.id} className="rounded-xl border border-border bg-muted/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Hipótese
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{h.hipotese}</p>
              <ArrowDown className="my-2 h-4 w-4 text-muted-foreground/40" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </p>
              <span
                className={cn(
                  "mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                  STATUS_CLASS[h.status],
                )}
              >
                {STATUS_LABEL[h.status]}
              </span>
              {(h.resultado_percentual != null || h.resultado_texto) && (
                <>
                  <ArrowDown className="my-2 h-4 w-4 text-muted-foreground/40" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Resultado
                  </p>
                  <p
                    className={cn(
                      "mt-1 flex items-center gap-1 text-sm font-semibold",
                      (h.resultado_percentual ?? 0) >= 0
                        ? "text-[color:var(--success)]"
                        : "text-destructive",
                    )}
                  >
                    {h.resultado_percentual != null && (
                      <>
                        <ArrowUp className="h-3.5 w-3.5" />
                        {h.resultado_percentual > 0 ? "+" : ""}
                        {h.resultado_percentual}%
                      </>
                    )}
                    {h.resultado_texto && (
                      <span className="font-normal text-foreground">{h.resultado_texto}</span>
                    )}
                  </p>
                </>
              )}
              {h.conclusao && (
                <>
                  <ArrowDown className="my-2 h-4 w-4 text-muted-foreground/40" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Conclusão
                  </p>
                  <p className="mt-1 text-sm text-foreground">{h.conclusao}</p>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
