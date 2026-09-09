import { MessageSquareWarning } from "lucide-react";
import type { TimelineEntry } from "@/modules/approval/services/build-card-timeline";

export function ChangeRequestBanner({ entry }: { entry: TimelineEntry }) {
  const who = entry.actorEmail?.split("@")[0] ?? "Cliente";
  const when = new Date(entry.createdAt).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <aside className="rounded-xl border border-[color:var(--cw-col-alteracoes)]/50 bg-[color:var(--cw-col-alteracoes)]/12 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageSquareWarning className="h-4 w-4 shrink-0" />
        Pedido de alteração do cliente
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {entry.message?.trim() || "O cliente pediu alterações, sem detalhe no texto."}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {who} · {when}
      </p>
    </aside>
  );
}
