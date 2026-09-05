import { Suspense, useState } from "react";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { WorkspaceWidgetShell, WidgetSkeleton } from "./WorkspaceWidgetShell";
import { getClientNotes, addAgencyNote } from "@/modules/agency-os/agency-os.server";
import { agencyOsKeys } from "@/modules/agency-os/query-keys";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/lots/FormField";

const notesQuery = (clientId: number) =>
  queryOptions({
    queryKey: agencyOsKeys.clientNotes(clientId),
    queryFn: () => getClientNotes({ data: { id: clientId } }),
  });

export function NotesWidget({ clientId }: { clientId: number }) {
  return (
    <Suspense
      fallback={
        <WorkspaceWidgetShell title="Observações" description="Feed de contexto">
          <WidgetSkeleton />
        </WorkspaceWidgetShell>
      }
    >
      <NotesWidgetContent clientId={clientId} />
    </Suspense>
  );
}

function NotesWidgetContent({ clientId }: { clientId: number }) {
  const qc = useQueryClient();
  const { data: notes } = useSuspenseQuery(notesQuery(clientId));
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);

  const mutation = useMutation({
    mutationFn: (body: string) => addAgencyNote({ data: { cadastro_cliente_id: clientId, body } }),
    onSuccess: async () => {
      setDraft("");
      setComposing(false);
      toast.success("Observação registrada");
      await qc.invalidateQueries({ queryKey: agencyOsKeys.clientNotes(clientId) });
      await qc.invalidateQueries({ queryKey: agencyOsKeys.clientTimeline(clientId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  return (
    <WorkspaceWidgetShell
      title="Observações"
      description="Contexto operacional"
      actions={
        !composing ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setComposing(true)}
          >
            Nova
          </Button>
        ) : null
      }
    >
      {composing && (
        <div className="mb-4 space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <TextArea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Registre contexto…"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!draft.trim() || mutation.isPending}
              onClick={() => mutation.mutate(draft)}
            >
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setComposing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma observação ainda.</p>
      ) : (
        <ul className="space-y-4">
          {notes.map((note) => {
            const author = note.author_email?.split("@")[0] ?? "Equipe";
            const initial = author.charAt(0).toUpperCase();
            return (
              <li key={note.id} className="flex gap-3">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                  aria-hidden
                >
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs font-semibold text-foreground">{author}</span>
                    <time className="text-[10px] text-muted-foreground" dateTime={note.created_at}>
                      {formatDistanceToNow(parseISO(note.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </time>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/90">{note.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WorkspaceWidgetShell>
  );
}
