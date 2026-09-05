import { ArrowDown, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiagnosticoInsight } from "@/lib/strategic-plan/types";
import { SectionCard } from "@/components/lots/SectionCard";

function DirectionIcon({ direction }: { direction: DiagnosticoInsight["direction"] }) {
  if (direction === "up") return <TrendingUp className="h-3.5 w-3.5 text-[color:var(--success)]" />;
  if (direction === "down") return <TrendingDown className="h-3.5 w-3.5 text-warning" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function DiagnosticoAtualBlock({ insights }: { insights: DiagnosticoInsight[] }) {
  return (
    <SectionCard
      eyebrow="Inteligência automática"
      title="Diagnóstico Atual"
      description="Narrativa gerada a partir das métricas do período do plano."
      className="border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent"
    >
      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sem dados suficientes para gerar diagnóstico neste período.
        </p>
      ) : (
        <div className="flex flex-col items-start gap-1">
          {insights.map((item, i) => (
            <div key={`${item.platform}-${i}`} className="flex flex-col items-start gap-1">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-border bg-card/80 px-3 py-2",
                  item.severity === "warning" && "border-warning/30",
                  item.severity === "success" && "border-[color:var(--success)]/30",
                )}
              >
                <DirectionIcon direction={item.direction} />
                <span className="text-[11px] font-medium text-muted-foreground">
                  {item.platformLabel}
                </span>
                <span className="text-sm font-medium text-foreground">{item.narrative}</span>
              </div>
              {i < insights.length - 1 && (
                <ArrowDown className="ml-4 h-4 w-4 text-muted-foreground/50" aria-hidden />
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
