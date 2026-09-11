import { cn } from "@/lib/utils";
import {
  parseRoteiroScenes,
  ROTEIRO_SCENE_KEYS,
  ROTEIRO_SCENE_LABELS,
  isRoteiroHtmlEmpty,
} from "@/modules/approval/services/roteiro-scenes";

export function RoteiroSceneCards({
  html,
  className,
}: {
  html: string | null | undefined;
  className?: string;
}) {
  const scenes = parseRoteiroScenes(html);
  return (
    <div className={cn("grid gap-3", className)}>
      {ROTEIRO_SCENE_KEYS.map((key) => {
        const inner = scenes[key];
        const empty = isRoteiroHtmlEmpty(inner);
        return (
          <article
            key={key}
            className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {ROTEIRO_SCENE_LABELS[key]}
            </p>
            {empty ? (
              <p className="mt-2 text-sm text-muted-foreground">—</p>
            ) : (
              <div
                className="roteiro-html prose prose-sm mt-2 max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: inner }}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}
