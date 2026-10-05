import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listPublishQueueFn, markPublishedManuallyFn } from "@/modules/approval/cards/cards.server";
import { isoToBrDate } from "@/modules/agency-os/tasks-sheet";

export function PublishQueuePanel({ cadastroClienteId }: { cadastroClienteId: number }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listPublishQueueFn);
  const markFn = useServerFn(markPublishedManuallyFn);
  const queue = useQuery({
    queryKey: ["publish-queue", cadastroClienteId],
    queryFn: () => listFn({ data: { cadastro_cliente_id: cadastroClienteId } }),
  });
  const mark = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Marcado como publicado.");
      void qc.invalidateQueries({ queryKey: ["publish-queue", cadastroClienteId] });
      void qc.invalidateQueries({ queryKey: ["lots-pendencias"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (queue.isLoading)
    return <p className="text-sm text-muted-foreground">Carregando publicações…</p>;
  if (queue.error) {
    return (
      <p className="text-sm text-destructive">
        {queue.error instanceof Error ? queue.error.message : "Não foi possível carregar."}
      </p>
    );
  }
  const rows = queue.data ?? [];
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum card agendado ou com falha.</p>;
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-muted bg-card px-3 py-3"
        >
          <div>
            <p className="font-medium">{row.titulo}</p>
            <p className="text-xs text-muted-foreground">
              {isoToBrDate(String(row.data_publicacao ?? "")) || "Sem data"}
              {row.publish_error ? ` · ${row.publish_error}` : " · Agendado"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/admin/aprovacoes/agendar/$cardId" params={{ cardId: row.id }}>
                Abrir
              </Link>
            </Button>
            <Button type="button" disabled={mark.isPending} onClick={() => mark.mutate(row.id)}>
              Marcar como publicado
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
