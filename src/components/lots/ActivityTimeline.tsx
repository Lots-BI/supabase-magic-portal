import { MessageSquare, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  id: string;
  created_at: string;
  autor_email?: string | null;
  label: string;
  subtitle?: string | null;
  mensagem?: string | null;
  tone?: "success" | "danger" | "warning" | "primary" | "muted";
  messageTone?: "warning" | "default";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TONE_DOT: Record<NonNullable<TimelineEvent["tone"]>, string> = {
  success: "bg-[color:var(--success)]",
  danger: "bg-destructive",
  warning: "bg-warning",
  primary: "bg-primary",
  muted: "bg-muted-foreground",
};

export function ActivityTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <ol className="relative space-y-0 border-l border-border pl-4">
      {sorted.map((r) => (
        <li key={r.id} className="relative pb-4 last:pb-0">
          <span
            className={cn(
              "absolute -left-[5px] top-1.5 h-2 w-2 rounded-full ring-2 ring-background",
              TONE_DOT[r.tone ?? "muted"],
            )}
          />
          <div className="ml-2 animate-in fade-in slide-in-from-left-1 duration-300">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-medium text-foreground">{r.label}</span>
              {r.subtitle && (
                <span className="text-[10px] text-muted-foreground">{r.subtitle}</span>
              )}
            </div>
            <p className="text-[10.5px] text-muted-foreground">
              {r.autor_email ?? "Sistema"} · {formatDate(r.created_at)}
            </p>
            {r.mensagem && (
              <p className="mt-1 flex items-start gap-1.5 rounded-md bg-background/60 p-2 text-[11.5px] text-foreground">
                {r.messageTone === "warning" ? (
                  <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                ) : (
                  <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                )}
                {r.mensagem}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
