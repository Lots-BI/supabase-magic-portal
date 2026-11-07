import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { SectionCard } from "@/components/lots/SectionCard";
import { DeltaPill } from "@/components/lots/DeltaPill";
import { cn } from "@/lib/utils";
import { insightsForOperationalReport } from "@/modules/report-analyst/report-analyst-context";
import type { OperationalReport } from "@/modules/operational-report/types";

export function ReportInsightsBlock({ report }: { report: OperationalReport }) {
  const insights = insightsForOperationalReport(report);
  const deltas = report.heroes.filter((hero) => hero.deltaPct != null);

  return (
    <SectionCard
      eyebrow="Leitura"
      title="O que os números dizem"
      description="Clima do recorte, variação dos heróis e sinais calculados em cima deles. Sem texto inventado."
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
            report.reading.mood === "up" && "bg-success/12 text-[color:var(--success)]",
            report.reading.mood === "down" && "bg-danger/12 text-[color:var(--danger)]",
            report.reading.mood === "steady" && "bg-muted text-muted-foreground",
          )}
        >
          {report.reading.moodLabel}
        </span>
        <p className="text-sm text-foreground">{report.reading.headline}</p>
      </div>

      {deltas.length > 0 ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {deltas.map((hero) => (
            <li
              key={hero.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2"
            >
              <span className="text-[13px] text-foreground">{hero.label}</span>
              <DeltaPill delta={hero.deltaPct} positiveIsGood={hero.positiveIsGood} />
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="mt-4 space-y-3">
        {insights.length === 0 ? (
          <li className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary-600 dark:text-primary-300">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[13px] font-medium text-foreground">Sem sinal extra</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Nenhuma variação entrou na regra automática deste recorte.
              </p>
            </div>
          </li>
        ) : (
          insights.map((insight) => (
            <li
              key={insight.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3"
            >
              <span
                className={cn(
                  "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md",
                  insight.tone === "positive" && "bg-success/12 text-[color:var(--success)]",
                  insight.tone === "negative" && "bg-danger/12 text-[color:var(--danger)]",
                  insight.tone === "neutral" &&
                    "bg-primary/10 text-primary-600 dark:text-primary-300",
                )}
              >
                {insight.tone === "positive" ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : insight.tone === "negative" ? (
                  <TrendingDown className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground">{insight.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{insight.detail}</p>
              </div>
            </li>
          ))
        )}
      </ul>
    </SectionCard>
  );
}
