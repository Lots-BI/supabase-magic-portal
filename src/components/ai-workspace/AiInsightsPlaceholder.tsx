import type { AiInsightContract } from "@/lib/ai-workspace/types";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Lock } from "lucide-react";

export function AiInsightsPlaceholder({ insights }: { insights: AiInsightContract[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {insights.map((insight) => (
        <div
          key={insight.id}
          className="relative rounded-xl border border-dashed border-border bg-muted/10 p-4 opacity-75"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">{insight.title}</h3>
            </div>
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Lock className="h-3 w-3" />
              Em breve
            </Badge>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{insight.description}</p>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {insight.category.replace(/_/g, " ")}
          </p>
        </div>
      ))}
    </div>
  );
}
