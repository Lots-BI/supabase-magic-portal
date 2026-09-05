import type { ModuleInfo } from "@/lib/ai-workspace/types";
import { Badge } from "@/components/ui/badge";

export function ModuleCardGrid({ modules }: { modules: ModuleInfo[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {modules.map((mod) => (
        <div
          key={mod.id}
          className="rounded-xl border border-border bg-card/50 p-4 transition-colors hover:border-primary/30"
        >
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-display text-sm font-semibold">{mod.label}</h3>
            <Badge variant="secondary" className="text-[10px]">
              {mod.id}
            </Badge>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{mod.objective}</p>
          <ul className="mb-3 space-y-1 text-[11px] text-muted-foreground">
            {mod.responsibilities.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
          <div className="mb-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-300">
              Arquivos
            </p>
            <div className="flex flex-wrap gap-1">
              {mod.mainFiles.slice(0, 4).map((f) => (
                <code key={f} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                  {f.split("/").pop()}
                </code>
              ))}
              {mod.mainFiles.length > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{mod.mainFiles.length - 4}
                </span>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Deps: {mod.dependencies.join(", ")}</p>
        </div>
      ))}
    </div>
  );
}
