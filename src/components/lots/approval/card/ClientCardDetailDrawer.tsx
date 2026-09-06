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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getClientContentCard,
  clientCommentCardFn,
  clientApproveCardFn,
  clientRequestChangesFn,
  createClientMaterialUploadUrl,
  confirmClientMaterialUpload,
} from "@/modules/approval/cards/client-cards.server";
import { MaterialUploadQueue } from "./MaterialUploadQueue";
import { getScopedContentCardFn } from "@/modules/client/scoped-portal.functions";
import { useOptionalClientScope } from "@/modules/client/context";
import { KANBAN_COLUMNS } from "@/modules/approval/workflow/column-config";
import { KANBAN_COLUMN_META, formatCardSchedule } from "../kanban/kanban-meta";
import { CardTimeline } from "../card/CardTimeline";
import { SocialPreviewPanel } from "../preview/SocialPreviewPanel";
import { assetsForPublishPreview, buildPreviewContext } from "@/lib/media-preview";
import { Check, CheckCircle2, Copy, MessageSquare, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";
import { PillarBadge } from "../shared/PillarBadge";
import { Link } from "@tanstack/react-router";
import type { ContentCard } from "@/modules/approval/types/content-card";
import type { MediaAsset } from "@/lib/media-preview";
import type { EditorialPillar } from "@/modules/approval/types/editorial-pillar";
import type { TimelineEntry } from "@/modules/approval/services/build-card-timeline";

type ClientCardDetail = {
  card: ContentCard;
  attachments: MediaAsset[];
  events: TimelineEntry[];
  pillar: Pick<EditorialPillar, "titulo" | "cor" | "objetivo"> | null;
};

function ReadField({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!value?.trim()) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value!);
      setCopied(true);
      toast.success("Copiado para a área de transferência.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <div className="space-y-2 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wider text-foreground/80">{label}</p>
        {copyable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => void handleCopy()}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            Copiar
          </Button>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{value}</p>
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
  const commentFn = useServerFn(clientCommentCardFn);
  const approveFn = useServerFn(clientApproveCardFn);
  const changesFn = useServerFn(clientRequestChangesFn);
  const createUploadUrlFn = useServerFn(createClientMaterialUploadUrl);
  const confirmUploadFn = useServerFn(confirmClientMaterialUpload);

  const [comment, setComment] = useState("");
  const [changeNote, setChangeNote] = useState("");

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

  const commentMut = useMutation({
    mutationFn: () => commentFn({ data: { card_id: cardId, mensagem: comment } }),
    onSuccess: () => {
      toast.success("Comentário enviado.");
      setComment("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMut = useMutation({
    mutationFn: () => approveFn({ data: { card_id: cardId, mensagem: null } }),
    onSuccess: () => {
      toast.success(
        awaitingFinal
          ? "Publicação aprovada — será agendada automaticamente."
          : "Roteiro e mídias enviados.",
      );
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changesMut = useMutation({
    mutationFn: () => changesFn({ data: { card_id: cardId, mensagem: changeNote } }),
    onSuccess: () => {
      toast.success("Alteração solicitada.");
      setChangeNote("");
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMeta = card ? KANBAN_COLUMN_META[card.status] : null;
  const previewCtx =
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

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[min(100dvh-2rem,920px)] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:rounded-xl [&>button]:right-4 [&>button]:top-4">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="pr-8 text-left">{card?.titulo ?? "Carregando…"}</DialogTitle>
          <DialogDescription className="text-left">
            {card && (
              <span className="inline-flex flex-wrap items-center gap-2">
                {statusMeta?.emoji}{" "}
                {KANBAN_COLUMNS.find((c) => c.status === card.status)?.label ?? card.status}
                <span className="text-muted-foreground">
                  · {formatCardSchedule(card.data_publicacao, card.hora_publicacao)}
                </span>
                {(card.status === "roteiro" || card.status === "aguardando_aprovacao") && (
                  <Button variant="link" className="h-auto p-0 text-xs" asChild>
                    <Link to="/aprovacoes/roteiro/$cardId" params={{ cardId }}>
                      Abrir roteiro
                    </Link>
                  </Button>
                )}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {detailQ.isLoading && (
          <div className="p-6">
            <ApprovalPanelSkeleton rows={5} />
          </div>
        )}

        {card && (
          <>
            {canAct && (
              <div className="shrink-0 space-y-4 border-b border-border bg-muted/40 px-6 py-4">
                <p className="text-sm font-medium text-foreground">
                  {awaitingFinal ? "Aprovar publicação" : "Aprovar roteiro e enviar mídias"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {awaitingFinal
                    ? "Confira a peça final. Ao aprovar, ela fica agendada para o horário combinado e o Instagram recebe o post automaticamente nesse momento."
                    : "Leia o roteiro, anexe as mídias gravadas e aprove. Um único passo."}
                </p>
                {!awaitingFinal && (card.roteiro || card.copy_text) ? (
                  <div
                    className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background p-3 text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{
                      __html: card.roteiro || card.copy_text || "",
                    }}
                  />
                ) : null}
                {awaitingRoteiro && (
                  <MaterialUploadQueue
                    label={
                      hasClientMaterial
                        ? `Anexar mais mídias (${clientMaterials.length})`
                        : "Anexar mídias gravadas"
                    }
                    createTicket={materialQueue.createTicket}
                    confirm={materialQueue.confirm}
                    onDone={materialQueue.onDone}
                  />
                )}
                <div className="space-y-2">
                  <Label htmlFor="change-note">
                    Motivo das alterações{" "}
                    <span className="font-normal text-muted-foreground">(se for pedir mudanças)</span>
                  </Label>
                  <Textarea
                    id="change-note"
                    rows={2}
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    placeholder="Ex.: Trocar o gancho inicial e reduzir o CTA…"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    size="lg"
                    className="flex-1"
                    onClick={() => approveMut.mutate()}
                    disabled={
                      approveMut.isPending ||
                      changesMut.isPending ||
                      (awaitingRoteiro && !hasClientMaterial)
                    }
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Aprovar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    onClick={() => {
                      if (!changeNote.trim()) {
                        toast.error("Descreva a alteração antes de enviar.");
                        return;
                      }
                      changesMut.mutate();
                    }}
                    disabled={changesMut.isPending || approveMut.isPending || !changeNote.trim()}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Pedir alterações
                  </Button>
                </div>
              </div>
            )}

            {awaitingMaterial && (
              <div className="shrink-0 space-y-3 border-b border-border px-6 py-4">
                <p className="text-sm text-muted-foreground">
                  Mídias recebidas. A agência vai baixar os originais e produzir a publicação.
                </p>
                <MaterialUploadQueue
                  label="Enviar arquivo extra"
                  createTicket={materialQueue.createTicket}
                  confirm={materialQueue.confirm}
                  onDone={materialQueue.onDone}
                />
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {previewCtx && (
                <div className="shrink-0 border-b border-border bg-muted/20 p-4">
                  <SocialPreviewPanel context={previewCtx} />
                </div>
              )}

              <div className="px-6 py-4">
                <Tabs defaultValue="conteudo">
                  <TabsList className="mb-4 w-full justify-start">
                    <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
                    <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="comentarios">Comentários</TabsTrigger>
                  </TabsList>

                  <TabsContent value="conteudo" className="space-y-4">
                    {detailQ.data?.pillar && (
                      <PillarBadge
                        pillar={{
                          titulo: detailQ.data.pillar.titulo,
                          cor: detailQ.data.pillar.cor,
                          objetivo: detailQ.data.pillar.objetivo,
                        }}
                      />
                    )}
                    <div className="divide-y divide-border">
                      <ReadField label="Rede social" value={card.plataforma} />
                      <ReadField label="Formato" value={card.formato} />
                      <ReadField label="Linha editorial" value={card.linha_editorial} />
                      <ReadField label="Tema" value={card.tema} />
                      <ReadField label="Roteiro" value={card.copy_text || card.roteiro} copyable />
                      <ReadField label="Legenda" value={card.legenda} copyable />
                      <ReadField label="Direção de arte" value={card.direcao_arte} />
                      <ReadField label="CTA" value={card.cta} />
                    </div>
                    {card.checklist.length > 0 && (
                      <div className="space-y-2 border-t border-border pt-4">
                        <p className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
                          Checklist
                        </p>
                        <ul className="space-y-1">
                          {card.checklist.map((item) => (
                            <li
                              key={item.id}
                              className={cn(
                                "text-sm",
                                item.done && "text-muted-foreground line-through",
                              )}
                            >
                              {item.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="arquivos">
                    {(detailQ.data?.attachments ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum arquivo anexado.</p>
                    ) : (
                      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {detailQ.data?.attachments.map((m) => (
                          <li key={m.id} className="overflow-hidden rounded-lg border border-border">
                            {m.kind === "video" ? (
                              <video
                                src={m.url}
                                className="aspect-square w-full object-cover"
                                controls
                              />
                            ) : (
                              <a href={m.url} target="_blank" rel="noreferrer">
                                <img
                                  src={m.url}
                                  alt=""
                                  className="aspect-square w-full object-cover"
                                />
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>

                  <TabsContent value="timeline">
                    <CardTimeline entries={detailQ.data?.events ?? []} />
                  </TabsContent>

                  <TabsContent value="comentarios" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="client-comment">Seu comentário</Label>
                      <Textarea
                        id="client-comment"
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Escreva um comentário…"
                        disabled={!canMutate}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => commentMut.mutate()}
                        disabled={!canMutate || !comment.trim() || commentMut.isPending}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Enviar comentário
                      </Button>
                    </div>
                    <CardTimeline
                      entries={(detailQ.data?.events ?? []).filter(
                        (e) =>
                          e.eventType === "commented" ||
                          e.eventType === "approved" ||
                          e.eventType === "changes_requested" ||
                          e.eventType === "material_submitted",
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
