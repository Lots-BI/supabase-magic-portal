import { useEffect, useRef, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getClientContentCard,
  clientApproveCardFn,
  clientRequestChangesFn,
  clientUpdateCaptionFn,
  createClientMaterialUploadUrl,
  confirmClientMaterialUpload,
} from "@/modules/approval/cards/client-cards.server";
import { ClientMaterialSendPanel } from "./ClientMaterialSendPanel";
import { CardAttachedMedia } from "./CardAttachedMedia";
import { getScopedContentCardFn } from "@/modules/client/scoped-portal.functions";
import { useOptionalClientScope } from "@/modules/client/context";
import { formatCardSchedule } from "../kanban/kanban-meta";
import { RoteiroHtmlEditor, RoteiroHtmlView } from "../roteiro/RoteiroHtmlEditor";
import { CaptionPanel } from "../shared/CaptionPanel";
import { AlteracoesPedidasField } from "../shared/AlteracoesPedidasField";
import { SocialPreviewPanel } from "../preview/SocialPreviewPanel";
import {
  assetsForCardDisplay,
  assetsForPublishPreview,
  buildPreviewContext,
} from "@/lib/media-preview";
import { CheckCircle2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";
import { isRoteiroHtmlEmpty, roteiroHtmlToPlain } from "@/modules/approval/services/roteiro-scenes";
import { latestResentChangeRequest } from "@/modules/approval/services/build-card-timeline";
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
  const captionFn = useServerFn(clientUpdateCaptionFn);
  const createUploadUrlFn = useServerFn(createClientMaterialUploadUrl);
  const confirmUploadFn = useServerFn(confirmClientMaterialUpload);

  const [editHtml, setEditHtml] = useState("");
  const [caption, setCaption] = useState("");
  const [changeMsg, setChangeMsg] = useState("");
  const [stayForMaterial, setStayForMaterial] = useState(false);
  const [canSendMaterial, setCanSendMaterial] = useState(false);
  const captionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendMaterial = useRef<() => void>(() => undefined);

  useEffect(() => {
    setStayForMaterial(false);
    setCanSendMaterial(false);
  }, [cardId]);

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
  /**
   * Baseado só no status — a prévia "Ver como cliente" (canMutate=false) mostra
   * exatamente os mesmos controles do cliente real; só a ação de fato é bloqueada.
   */
  const awaitingRoteiro = card?.status === "aguardando_aprovacao" && !stayForMaterial;
  const awaitingFinal = card?.status === "aguardando_aprovacao_final";
  const awaitingMaterial = card?.status === "aguardando_material" || stayForMaterial;
  const canAct = awaitingRoteiro || awaitingFinal;
  const previewOnly = !canMutate;
  const clientMaterials = (detailQ.data?.attachments ?? []).filter(
    (a) => a.mediaRole === "cliente_material",
  );

  const loadedCardId = card?.id;
  const loadedCardRoteiro = card?.roteiro;
  const loadedCardCopyText = card?.copy_text;
  const loadedCardLegenda = card?.legenda;
  useEffect(() => {
    if (!loadedCardId) return;
    if (awaitingRoteiro) {
      setEditHtml(loadedCardRoteiro || loadedCardCopyText || "");
      setCaption(loadedCardLegenda ?? "");
    }
    if (awaitingFinal) setChangeMsg("");
  }, [
    loadedCardId,
    loadedCardRoteiro,
    loadedCardCopyText,
    loadedCardLegenda,
    awaitingRoteiro,
    awaitingFinal,
  ]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["client-content-card", scopeKey, cardId] });
    qc.invalidateQueries({ queryKey: ["content-library"] });
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
  };

  const approveMut = useMutation({
    mutationFn: () => {
      flushCaptionTimer();
      return approveFn({
        data: {
          card_id: cardId,
          mensagem: null,
          ...(awaitingRoteiro ? { legenda: caption } : {}),
        },
      });
    },
    onSuccess: () => {
      if (awaitingFinal) {
        toast.success("No ar no horário combinado.");
        invalidate();
        onClose();
        return;
      }
      toast.success("Roteiro aprovado. Envie as mídias.");
      setStayForMaterial(true);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changesMut = useMutation({
    mutationFn: () => {
      flushCaptionTimer();
      return awaitingFinal
        ? changesFn({
            data: {
              card_id: cardId,
              mensagem: changeMsg.trim(),
            },
          })
        : changesFn({
            data: {
              card_id: cardId,
              mensagem: roteiroHtmlToPlain(editHtml).slice(0, 2000),
              roteiro: editHtml,
              legenda: caption,
            },
          });
    },
    onSuccess: () => {
      toast.success("Alteração enviada.");
      setEditHtml("");
      setChangeMsg("");
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveCaptionMut = useMutation({
    mutationFn: (value: string) => captionFn({ data: { card_id: cardId, legenda: value } }),
    onError: (e: Error) => toast.error(e.message),
  });

  function flushCaptionTimer() {
    if (captionTimer.current) {
      clearTimeout(captionTimer.current);
      captionTimer.current = null;
    }
  }

  useEffect(
    () => () => {
      flushCaptionTimer();
    },
    [],
  );

  const displayAssets = assetsForCardDisplay(
    detailQ.data?.attachments ?? [],
    awaitingFinal || card?.status === "publicado" || card?.status === "agendado",
  );
  const displayIds = new Set(displayAssets.map((asset) => asset.id));
  const extraClientMaterials = clientMaterials.filter((asset) => !displayIds.has(asset.id));
  const instagramPreview =
    card &&
    buildPreviewContext(
      {
        formato: card.formato,
        plataforma: card.plataforma,
        legenda: card.legenda,
        cliente_nome: card.cliente_nome,
        data_publicacao: card.data_publicacao,
        localizacao: card.localizacao,
      },
      assetsForPublishPreview(detailQ.data?.attachments ?? [], "final"),
    );

  const approveDisabled = approveMut.isPending || changesMut.isPending;
  const changeDisabled =
    changesMut.isPending ||
    approveMut.isPending ||
    (awaitingRoteiro && isRoteiroHtmlEmpty(editHtml)) ||
    (awaitingFinal && !changeMsg.trim());

  function guardPreview(): boolean {
    if (!previewOnly) return false;
    toast.info("Pré-visualização — ações não são registradas.");
    return true;
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[94dvh] sm:w-[calc(100vw-2rem)] sm:max-w-5xl sm:rounded-2xl [&>button]:right-3 [&>button]:top-3">
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
              {awaitingFinal ? (
                <>
                  <AlteracoesPedidasField
                    mensagem={
                      latestResentChangeRequest(detailQ.data?.events ?? [], "peca")?.message ?? null
                    }
                  />
                  {instagramPreview ? (
                    <SocialPreviewPanel context={instagramPreview} phone />
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="pedir-alteracoes">Pedir alterações</Label>
                    <Textarea
                      id="pedir-alteracoes"
                      rows={4}
                      value={changeMsg}
                      onChange={(e) => setChangeMsg(e.target.value)}
                      placeholder="Descreva o que precisa mudar na peça"
                      disabled={previewOnly}
                    />
                  </div>
                </>
              ) : awaitingMaterial ? (
                <ClientMaterialSendPanel
                  existing={clientMaterials}
                  disabled={previewOnly}
                  accept={card.formato === "reels" ? "video/*" : MATERIAL_ACCEPT}
                  createTicket={materialQueue.createTicket}
                  confirm={materialQueue.confirm}
                  onSent={invalidate}
                  onCanSendChange={setCanSendMaterial}
                  bindSubmit={(fn) => {
                    sendMaterial.current = fn;
                  }}
                />
              ) : (
                <>
                  {awaitingRoteiro ? (
                    <AlteracoesPedidasField
                      mensagem={
                        latestResentChangeRequest(detailQ.data?.events ?? [], "roteiro")?.message ??
                        null
                      }
                    />
                  ) : null}
                  {displayAssets.length > 0 ? <CardAttachedMedia assets={displayAssets} /> : null}

                  {awaitingRoteiro ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Leia o roteiro e a legenda com atenção. Quer mudar o roteiro? Edite direto
                        aqui e toque em <strong>Enviar alteração</strong>.
                      </p>
                      <RoteiroHtmlEditor
                        resetKey={card.id}
                        html={card.roteiro || card.copy_text}
                        editable
                        size="hero"
                        minHeightClass="min-h-[50vh]"
                        onChange={setEditHtml}
                      />
                    </div>
                  ) : (
                    <RoteiroHtmlView
                      html={card.roteiro || card.copy_text}
                      size="hero"
                      className="min-h-[50vh]"
                    />
                  )}

                  <CaptionPanel
                    value={awaitingRoteiro ? caption : (card.legenda ?? "")}
                    editable={awaitingRoteiro && !previewOnly}
                    onChange={(value) => {
                      setCaption(value);
                      if (previewOnly) return;
                      if (captionTimer.current) clearTimeout(captionTimer.current);
                      captionTimer.current = setTimeout(() => saveCaptionMut.mutate(value), 800);
                    }}
                  />
                </>
              )}

              {(card.status === "publicado" || card.publish_status === "published") && (
                <PublishedIgMetrics ig={detailQ.data?.publishedIg} />
              )}

              {!awaitingFinal && !awaitingMaterial && extraClientMaterials.length > 0 ? (
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

              {awaitingRoteiro ? (
                <p className="text-xs text-muted-foreground">
                  A agência recebe o roteiro editado e volta com a versão ajustada.
                </p>
              ) : null}
            </div>

            {awaitingMaterial ? (
              <div className="absolute inset-x-0 bottom-0 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
                <Button
                  type="button"
                  size="lg"
                  className="h-14 w-full"
                  disabled={!canSendMaterial}
                  onClick={() => {
                    if (guardPreview()) return;
                    sendMaterial.current();
                  }}
                >
                  <Send className="mr-2 h-5 w-5" />
                  Enviar mídias
                </Button>
              </div>
            ) : canAct ? (
              <div className="absolute inset-x-0 bottom-0 flex gap-2 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
                <Button
                  type="button"
                  size="lg"
                  className="h-14 flex-1 bg-[color:var(--success)] text-white hover:bg-[color:var(--success)]/90 disabled:bg-muted disabled:text-muted-foreground"
                  onClick={() => {
                    if (guardPreview()) return;
                    approveMut.mutate();
                  }}
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
                    if (guardPreview()) return;
                    changesMut.mutate();
                  }}
                  disabled={changeDisabled}
                >
                  Enviar alteração
                </Button>
              </div>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
