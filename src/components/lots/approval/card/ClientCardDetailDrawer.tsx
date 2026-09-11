import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getClientContentCard,
  clientApproveCardFn,
  clientRequestChangesFn,
  createClientMaterialUploadUrl,
  confirmClientMaterialUpload,
} from "@/modules/approval/cards/client-cards.server";
import { MaterialUploadQueue } from "./MaterialUploadQueue";
import { CardAttachedMedia } from "./CardAttachedMedia";
import { getScopedContentCardFn } from "@/modules/client/scoped-portal.functions";
import { useOptionalClientScope } from "@/modules/client/context";
import { formatCardSchedule } from "../kanban/kanban-meta";
import { RoteiroHtmlEditor, RoteiroHtmlView } from "../roteiro/RoteiroHtmlEditor";
import { assetsForCardDisplay } from "@/lib/media-preview";
import { Check, CheckCircle2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";
import { isRoteiroHtmlEmpty, roteiroHtmlToPlain } from "@/modules/approval/services/roteiro-scenes";
import type { ContentCard } from "@/modules/approval/types/content-card";
import type { MediaAsset } from "@/lib/media-preview";
import type { EditorialPillar } from "@/modules/approval/types/editorial-pillar";
import type { TimelineEntry } from "@/modules/approval/services/build-card-timeline";
import type { PublishedIgSnapshot } from "@/modules/instagram-posts/types";
import { PublishedIgMetrics } from "./PublishedIgMetrics";
import { MATERIAL_ACCEPT } from "@/modules/approval/services/material-upload";

type ClientCardDetail = {
  card: ContentCard;
  attachments: MediaAsset[];
  events: TimelineEntry[];
  pillar: Pick<EditorialPillar, "titulo" | "cor" | "objetivo"> | null;
  publishedIg?: PublishedIgSnapshot | null;
};

function CaptionBlock({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Legenda copiada.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Legenda</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1.5 px-2 text-xs"
          onClick={() => void handleCopy()}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed">{value}</p>
    </div>
  );
}

export function ClientCardDetailDrawer({
  cardId,
  onClose,
  onMutated,
  allowMutations,
}: {
  cardId: string;
  onClose: () => void;
  onMutated: () => void;
  allowMutations?: boolean;
}) {
  const qc = useQueryClient();
  const getFn = useServerFn(getClientContentCard);
  const scopedGetFn = useServerFn(getScopedContentCardFn);
  const portalScope = useOptionalClientScope();
  const approveFn = useServerFn(clientApproveCardFn);
  const changesFn = useServerFn(clientRequestChangesFn);
  const createUploadUrlFn = useServerFn(createClientMaterialUploadUrl);
  const confirmUploadFn = useServerFn(confirmClientMaterialUpload);

  const [changeOpen, setChangeOpen] = useState(false);
  const [editHtml, setEditHtml] = useState("");

  const scopeKey = portalScope?.scopeQueryKey ?? "client";
  const canMutate = allowMutations ?? portalScope?.mode !== "slug_context";

  const detailQ = useQuery({
    queryKey: ["client-content-card", scopeKey, cardId],
    queryFn: async (): Promise<ClientCardDetail> =>
      (portalScope?.mode === "slug_context"
        ? await scopedGetFn({ data: { scope: portalScope.scopeInput, id: cardId } })
        : await getFn({ data: { id: cardId } })) as ClientCardDetail,
    enabled: !!cardId,
  });

  const card = detailQ.data?.card;
  const awaitingRoteiro = card?.status === "aguardando_aprovacao" && canMutate;
  const awaitingFinal = card?.status === "aguardando_aprovacao_final" && canMutate;
  const awaitingMaterial = card?.status === "aguardando_material" && canMutate;
  const canAct = awaitingRoteiro || awaitingFinal;
  const clientMaterials = (detailQ.data?.attachments ?? []).filter(
    (a) => a.mediaRole === "cliente_material",
  );
  const hasClientMaterial = clientMaterials.length > 0;
  const needsCapture = awaitingRoteiro || awaitingMaterial;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["client-content-card", scopeKey, cardId] });
    onMutated();
  };

  const materialQueue = {
    createTicket: async (file: File) =>
      createUploadUrlFn({
        data: {
          cardId,
          fileName: file.name,
          mimeType: file.type || "",
          fileSize: file.size,
        },
      }),
    confirm: async (input: {
      path: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
    }) =>
      confirmUploadFn({
        data: { cardId, ...input },
      }),
    onDone: invalidate,
  };

  const approveMut = useMutation({
    mutationFn: () => approveFn({ data: { card_id: cardId, mensagem: null } }),
    onSuccess: () => {
      toast.success(awaitingFinal ? "No ar no horário combinado." : "Enviado.");
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changesMut = useMutation({
    mutationFn: () =>
      changesFn({
        data: {
          card_id: cardId,
          mensagem: roteiroHtmlToPlain(editHtml).slice(0, 2000),
          roteiro: editHtml,
        },
      }),
    onSuccess: () => {
      toast.success("Alteração enviada.");
      setEditHtml("");
      setChangeOpen(false);
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const displayAssets = assetsForCardDisplay(
    detailQ.data?.attachments ?? [],
    awaitingFinal || card?.status === "publicado" || card?.status === "agendado",
  );
  const displayIds = new Set(displayAssets.map((asset) => asset.id));
  const extraClientMaterials = clientMaterials.filter((asset) => !displayIds.has(asset.id));

  const approveDisabled =
    approveMut.isPending || changesMut.isPending || (awaitingRoteiro && !hasClientMaterial);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[min(100dvh-1rem,920px)] sm:w-[calc(100vw-1.5rem)] sm:max-w-lg sm:rounded-2xl [&>button]:right-3 [&>button]:top-3">
        <DialogHeader className="sr-only">
          <DialogTitle>{card?.titulo ?? "Conteúdo"}</DialogTitle>
          <DialogDescription>
            {card ? formatCardSchedule(card.data_publicacao, card.hora_publicacao) : ""}
          </DialogDescription>
        </DialogHeader>

        {detailQ.isLoading && (
          <div className="p-6">
            <ApprovalPanelSkeleton rows={5} />
          </div>
        )}

        {card && (
          <>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-28 pt-12">
              {displayAssets.length > 0 ? <CardAttachedMedia assets={displayAssets} /> : null}

              {changeOpen && canAct ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Edite o roteiro com o que precisa mudar e envie a alteração.
                  </p>
                  <RoteiroHtmlEditor
                    resetKey={`${card.id}-edit`}
                    html={editHtml}
                    editable
                    minHeightClass="min-h-[280px]"
                    onChange={setEditHtml}
                  />
                </div>
              ) : (
                <RoteiroHtmlView html={card.roteiro || card.copy_text} />
              )}

              {awaitingFinal && card.legenda?.trim() ? <CaptionBlock value={card.legenda} /> : null}

              {(card.status === "publicado" || card.publish_status === "published") && (
                <PublishedIgMetrics ig={detailQ.data?.publishedIg} />
              )}

              {needsCapture ? (
                <MaterialUploadQueue
                  variant="camera"
                  capture
                  empty={!hasClientMaterial}
                  accept={card.formato === "reels" ? "video/*" : MATERIAL_ACCEPT}
                  createTicket={materialQueue.createTicket}
                  confirm={materialQueue.confirm}
                  onDone={materialQueue.onDone}
                />
              ) : null}

              {extraClientMaterials.length > 0 ? (
                <ul className="grid grid-cols-3 gap-2">
                  {extraClientMaterials.map((m) => (
                    <li key={m.id} className="overflow-hidden rounded-xl border border-border">
                      {m.kind === "video" ? (
                        <video src={m.url} className="aspect-square w-full object-cover" />
                      ) : (
                        <img src={m.url} alt="" className="aspect-square w-full object-cover" />
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}

              {changeOpen && canAct ? (
                <p className="text-xs text-muted-foreground">
                  A agência recebe o roteiro editado e volta com a versão ajustada.
                </p>
              ) : null}
            </div>

            {canAct ? (
              <div className="absolute inset-x-0 bottom-0 flex gap-2 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
                <Button
                  type="button"
                  size="lg"
                  className="h-14 flex-1 bg-[color:var(--success)] text-white hover:bg-[color:var(--success)]/90 disabled:bg-muted disabled:text-muted-foreground"
                  onClick={() => approveMut.mutate()}
                  disabled={approveDisabled}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Aprovar
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className={cn(
                    "h-14 flex-1 bg-[color:var(--warning)] text-foreground hover:bg-[color:var(--warning)]/90",
                  )}
                  onClick={() => {
                    if (!changeOpen) {
                      setEditHtml(card.roteiro || card.copy_text || "");
                      setChangeOpen(true);
                      return;
                    }
                    if (isRoteiroHtmlEmpty(editHtml)) return;
                    changesMut.mutate();
                  }}
                  disabled={
                    changesMut.isPending ||
                    approveMut.isPending ||
                    (changeOpen && isRoteiroHtmlEmpty(editHtml))
                  }
                >
                  {changeOpen ? "Enviar alteração" : "Mudar"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
