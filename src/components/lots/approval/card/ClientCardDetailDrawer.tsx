import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getClientContentCard,
  clientCommentCardFn,
  clientApproveCardFn,
  clientRequestChangesFn,
} from "@/modules/approval/cards/client-cards.server";
import { getScopedContentCardFn } from "@/modules/client/scoped-portal.functions";
import { useOptionalClientScope } from "@/modules/client/context";
import { KANBAN_COLUMNS } from "@/modules/approval/workflow/column-config";
import { KANBAN_COLUMN_META, formatCardSchedule } from "../kanban/kanban-meta";
import { CardTimeline } from "../card/CardTimeline";
import { SocialPreviewPanel } from "../preview/SocialPreviewPanel";
import { buildPreviewContext } from "@/lib/media-preview";
import { Check, CheckCircle2, Copy, MessageSquare, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";
import { PillarBadge } from "../shared/PillarBadge";

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
}: {
  cardId: string;
  onClose: () => void;
  onMutated: () => void;
}) {
  const qc = useQueryClient();
  const getFn = useServerFn(getClientContentCard);
  const scopedGetFn = useServerFn(getScopedContentCardFn);
  const portalScope = useOptionalClientScope();
  const commentFn = useServerFn(clientCommentCardFn);
  const approveFn = useServerFn(clientApproveCardFn);
  const changesFn = useServerFn(clientRequestChangesFn);

  const [comment, setComment] = useState("");
  const [changeNote, setChangeNote] = useState("");

  const scopeKey = portalScope?.scopeQueryKey ?? "client";

  const detailQ = useQuery({
    queryKey: ["client-content-card", scopeKey, cardId],
    queryFn: () =>
      portalScope
        ? scopedGetFn({ data: { scope: portalScope.scopeInput, id: cardId } })
        : getFn({ data: { id: cardId } }),
    enabled: !!cardId,
  });

  const card = detailQ.data?.card;
  const canAct = card?.status === "aguardando_aprovacao" && portalScope?.mode !== "slug_context";

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["client-content-card", scopeKey, cardId] });
    onMutated();
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
      toast.success("Conteúdo aprovado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changesMut = useMutation({
    mutationFn: () => changesFn({ data: { card_id: cardId, mensagem: changeNote } }),
    onSuccess: () => {
      toast.success("Alteração solicitada.");
      setChangeNote("");
      invalidate();
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
      detailQ.data?.attachments ?? [],
    );

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex h-[100dvh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
          <SheetTitle className="pr-8 text-left">{card?.titulo ?? "Carregando…"}</SheetTitle>
          <SheetDescription className="text-left">
            {card && (
              <span className="inline-flex items-center gap-2">
                {statusMeta?.emoji} {KANBAN_COLUMNS.find((c) => c.status === card.status)?.label}
                <span className="text-muted-foreground">
                  · {formatCardSchedule(card.data_publicacao, card.hora_publicacao)}
                </span>
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        {detailQ.isLoading && (
          <div className="p-6">
            <ApprovalPanelSkeleton rows={5} />
          </div>
        )}

        {card && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {previewCtx && (
              <div className="border-b border-border bg-muted/20 p-4">
                <SocialPreviewPanel context={previewCtx} />
              </div>
            )}

            {canAct && (
              <div className="flex flex-wrap gap-2 border-b border-border px-6 py-4">
                <Button
                  type="button"
                  className="flex-1 sm:flex-none"
                  onClick={() => approveMut.mutate()}
                  disabled={approveMut.isPending}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Aprovar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    if (!changeNote.trim()) {
                      toast.error("Descreva a alteração antes de enviar.");
                      return;
                    }
                    changesMut.mutate();
                  }}
                  disabled={changesMut.isPending}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Solicitar alteração
                </Button>
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
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => commentMut.mutate()}
                      disabled={!comment.trim() || commentMut.isPending}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Enviar comentário
                    </Button>
                  </div>
                  {canAct && (
                    <div className="space-y-2 border-t border-border pt-4">
                      <Label htmlFor="change-note">
                        Motivo da alteração (opcional na aba ações)
                      </Label>
                      <Textarea
                        id="change-note"
                        rows={2}
                        value={changeNote}
                        onChange={(e) => setChangeNote(e.target.value)}
                        placeholder="Descreva o que precisa ser ajustado…"
                      />
                    </div>
                  )}
                  <CardTimeline
                    entries={(detailQ.data?.events ?? []).filter(
                      (e) =>
                        e.eventType === "commented" ||
                        e.eventType === "approved" ||
                        e.eventType === "changes_requested",
                    )}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
