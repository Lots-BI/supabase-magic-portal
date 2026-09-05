import { cn } from "@/lib/utils";
import type { FlowDefinition } from "@/lib/ai-workspace/types";
import { ArrowDown } from "lucide-react";

export function FlowTimeline({ flows }: { flows: FlowDefinition[] }) {
  return (
    <div className="space-y-8">
      {flows.map((flow) => (
        <div key={flow.id}>
          <h3 className="mb-3 text-sm font-semibold text-foreground">{flow.name}</h3>
          <div className="flex flex-col items-start gap-0">
            {flow.steps.map((step, i) => (
              <div key={i} className="flex flex-col items-start">
                <div
                  className={cn(
                    "rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground",
                  )}
                >
                  {step}
                </div>
                {i < flow.steps.length - 1 && (
                  <ArrowDown className="my-1 ml-4 h-4 w-4 text-muted-foreground" aria-hidden />
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Fonte: {flow.sourceSlug}</p>
        </div>
      ))}
    </div>
  );
}
