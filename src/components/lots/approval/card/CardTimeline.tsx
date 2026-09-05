import type { TimelineEntry } from "@/modules/approval/services/build-card-timeline";
import { formatTimelineSentence } from "@/modules/approval/services/build-card-timeline";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function CardTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>;
  }

  return (
    <ol className="space-y-4">
      {entries.map((entry) => (
        <li key={entry.id} className="relative border-l-2 border-border pl-4">
          <p className="text-sm text-foreground">{formatTimelineSentence(entry)}</p>
          {entry.message && (
            <p className="mt-1 rounded-md bg-muted/60 px-2 py-1 text-sm text-muted-foreground">
              {entry.message}
            </p>
          )}
          <time className="mt-1 block text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: ptBR })}
          </time>
        </li>
      ))}
    </ol>
  );
}
