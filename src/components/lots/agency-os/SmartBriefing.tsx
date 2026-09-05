import { cn } from "@/lib/utils";
import type { MorningBriefing } from "@/modules/agency-os";
import type { AgencyPosture } from "@/modules/agency-os/intelligence/types";

const POSTURE_BORDER: Record<AgencyPosture, string> = {
  good: "border-l-[color:var(--success)]",
  attention: "border-l-[color:var(--warning)]",
  critical: "border-l-[color:var(--danger)]",
};

export function SmartBriefing({
  briefing,
  className,
}: {
  briefing: MorningBriefing & { posture?: AgencyPosture; narrativeLines?: string[] };
  className?: string;
}) {
  const lines = briefing.narrativeLines ?? briefing.lines;
  const posture = briefing.posture ?? "good";

  return (
    <section
      className={cn(
        "lots-surface lots-petal-accent relative overflow-hidden bg-gradient-to-br from-card to-card/60 p-6 sm:p-8",
        className,
      )}
      aria-label="Resumo do dia"
    >
      <div className="relative z-[1] space-y-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {briefing.greeting}
          <span className="ml-1.5" aria-hidden>
            👋
          </span>
        </h1>
        <div className={cn("space-y-1.5 border-l-2 pl-4", POSTURE_BORDER[posture])}>
          {lines.map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
