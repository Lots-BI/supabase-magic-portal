import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Archive } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getLibraryItemFn } from "@/modules/approval/library/library.server";
import { getClientLibraryItemFn } from "@/modules/approval/library/client-library.server";
import { getScopedLibraryItemFn } from "@/modules/client/scoped-portal.functions";
import { useOptionalClientScope } from "@/modules/client/context";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";
import { PillarBadge } from "../shared/PillarBadge";
import { formatCardSchedule } from "../kanban/kanban-meta";
import { KANBAN_COLUMN_META } from "../kanban/kanban-meta";

export function LibraryDetailDrawer({
  itemId,
  readOnly,
  clientMode,
  onClose,
  onArchive,
}: {
  itemId: string;
  readOnly?: boolean;
  clientMode?: boolean;
  onClose: () => void;
  onArchive?: () => void;
}) {
  const staffFn = useServerFn(getLibraryItemFn);
  const clientFn = useServerFn(getClientLibraryItemFn);
  const scopedFn = useServerFn(getScopedLibraryItemFn);
  const portalScope = useOptionalClientScope();

  const scopeKey = portalScope?.scopeQueryKey ?? (clientMode ? "client" : "staff");

  const detailQ = useQuery({
    queryKey: ["library-item", scopeKey, itemId],
    queryFn: () => {
      if (portalScope) {
        return scopedFn({ data: { scope: portalScope.scopeInput, id: itemId } });
      }
      return clientMode ? clientFn({ data: { id: itemId } }) : staffFn({ data: { id: itemId } });
    },
    enabled: !!itemId,
  });

  const card = detailQ.data?.card;
  const statusMeta = card ? KANBAN_COLUMN_META[card.status] : null;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex h-[100dvh] w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{card?.titulo ?? "Carregando…"}</SheetTitle>
          <SheetDescription>
            {card && (
              <>
                {statusMeta?.emoji} {card.status.replace(/_/g, " ")} ·{" "}
                {formatCardSchedule(card.data_publicacao, card.hora_publicacao)}
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        {detailQ.isLoading && (
          <div className="mt-4">
            <ApprovalPanelSkeleton rows={4} />
          </div>
        )}

        {card && (
          <div className="mt-6 space-y-4">
            {detailQ.data?.pillar && (
              <PillarBadge
                pillar={{
                  titulo: detailQ.data.pillar.titulo,
                  cor: detailQ.data.pillar.cor,
                  objetivo: detailQ.data.pillar.objetivo,
                }}
              />
            )}

            <dl className="space-y-3 text-sm">
              <Row label="Cliente" value={card.cliente_nome} />
              <Row label="Rede" value={card.plataforma} />
              <Row label="Formato" value={card.formato} />
              <Row label="Publicado em" value={card.published_at?.slice(0, 10) ?? "—"} />
              {card.archived_at && (
                <Row label="Arquivado em" value={card.archived_at.slice(0, 10)} />
              )}
              {card.legenda && <Row label="Legenda" value={card.legenda} multiline />}
              {card.copy_text && <Row label="Copy" value={card.copy_text} multiline />}
            </dl>

            {card.capa_url && (
              <div className="overflow-hidden rounded-xl border border-border">
                <img src={card.capa_url} alt="" className="w-full object-cover" />
              </div>
            )}

            {(detailQ.data?.attachments.length ?? 0) > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Arquivos
                </p>
                <ul className="space-y-2">
                  {detailQ.data!.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={a.url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Download className="h-4 w-4" />
                        Baixar mídia
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!readOnly && card.status === "publicado" && onArchive && (
              <Button type="button" variant="outline" onClick={onArchive}>
                <Archive className="mr-2 h-4 w-4" />
                Arquivar conteúdo
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={multiline ? "mt-1 whitespace-pre-wrap" : "mt-0.5"}>{value}</dd>
    </div>
  );
}
