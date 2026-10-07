import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  archiveCard,
  commentCard,
  duplicateCard,
  getContentCard,
  markMaterialsDownloadedFn,
  moveCard,
  updateCard,
  listEditorialPillars,
} from "@/modules/approval/cards/cards.server";
import type { ContentCardStatus } from "@/modules/approval/types/content-card";
import { KANBAN_COLUMNS } from "@/modules/approval/workflow/column-config";
import { canTransitionStatus } from "@/modules/approval/workflow/status-machine";
import { CardTimeline } from "./CardTimeline";
import { CardMediaUpload } from "./CardMediaUpload";
import { SelectableMediaGallery } from "./SelectableMediaGallery";
import { RoteiroHtmlEditor } from "../roteiro/RoteiroHtmlEditor";
import { CaptionPanel } from "../shared/CaptionPanel";
import { MobileStatusPicker } from "../kanban/MobileStatusPicker";
import { KANBAN_COLUMN_META } from "../kanban/kanban-meta";
import { MediaPreview } from "@/components/lots/MediaPreview/MediaPreview";
import { assetsForPublishPreview, buildPreviewContext } from "@/lib/media-preview";
import { Copy, Archive, MessageSquare, Play } from "lucide-react";
import { PillarBadge } from "../shared/PillarBadge";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";
import { ApprovalConfirmDialog } from "../shared/ApprovalConfirmDialog";
import { PublishedIgMetrics } from "./PublishedIgMetrics";
import { BrDateTimeFields, horaToDbValue } from "../shared/BrDateTimeFields";

export function CardDetailDrawer({
  cardId,
  cadastroClienteId,
  onClose,
  onMutated,
}: {
  cardId: string;
  cadastroClienteId: number;
  onClose: () => void;
  onMutated: () => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const getFn = useServerFn(getContentCard);
  const updateFn = useServerFn(updateCard);
  const moveFn = useServerFn(moveCard);
  const archiveFn = useServerFn(archiveCard);
  const duplicateFn = useServerFn(duplicateCard);
  const commentFn = useServerFn(commentCard);
  const pillarsFn = useServerFn(listEditorialPillars);
  const markFn = useServerFn(markMaterialsDownloadedFn);

  const detailQ = useQuery({
    queryKey: ["content-card", cardId],
    queryFn: () => getFn({ data: { id: cardId } }),
    enabled: !!cardId,
  });

  const pillarsQ = useQuery({
    queryKey: ["editorial-pillars", cadastroClienteId],
    queryFn: () => pillarsFn({ data: { cadastro_cliente_id: cadastroClienteId } }),
  });

  const card = detailQ.data?.card;
  const publishedIg = detailQ.data?.publishedIg;
  const [comment, setComment] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [draft, setDraft] = useState({
    titulo: "",
    legenda: "",
    copy_text: "",
    roteiro: "",
    direcao_arte: "",
    cta: "",
    observacoes: "",
    pilar_id: "" as string,
    data_publicacao: "",
    hora_publicacao: "",
  });
  const [draftCardId, setDraftCardId] = useState<string | null>(null);

  useEffect(() => {
    if (!card) return;
    setDraft({
      titulo: card.titulo,
      legenda: card.legenda ?? "",
      copy_text: card.copy_text ?? "",
      roteiro: card.roteiro ?? "",
      direcao_arte: card.direcao_arte ?? "",
      cta: card.cta ?? "",
      observacoes: card.observacoes ?? "",
      pilar_id: card.pilar_id ?? "",
      data_publicacao: card.data_publicacao,
      hora_publicacao: card.hora_publicacao?.slice(0, 5) ?? "",
    });
    setDraftCardId(card.id);
  }, [
    card?.id,
    card?.titulo,
    card?.legenda,
    card?.copy_text,
    card?.roteiro,
    card?.direcao_arte,
    card?.cta,
    card?.observacoes,
    card?.pilar_id,
    card?.data_publicacao,
    card?.hora_publicacao,
  ]);

  const captionValue =
    card && draftCardId === card.id ? draft.legenda : (card?.legenda ?? draft.legenda);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["content-card", cardId] });
    onMutated();
  };

  const selectedPillar = useMemo(() => {
    if (detailQ.data?.pillar) {
      return {
        titulo: detailQ.data.pillar.titulo,
        cor: detailQ.data.pillar.cor,
        objetivo: detailQ.data.pillar.objetivo,
      };
    }
    const p = (pillarsQ.data ?? []).find((x) => x.id === draft.pilar_id);
    return p ? { titulo: p.titulo, cor: p.cor, objetivo: p.objetivo } : null;
  }, [detailQ.data?.pillar, pillarsQ.data, draft.pilar_id]);

  const saveMut = useMutation({
    mutationFn: () => {
      const hora = horaToDbValue(draft.hora_publicacao);
      if (hora === false) {
        return Promise.reject(new Error("Informe um horário válido (HH:mm)."));
      }
      return updateFn({
        data: {
          id: cardId,
          titulo: draft.titulo,
          legenda: (draftCardId === cardId ? draft.legenda : (card?.legenda ?? "")).trim() || null,
          roteiro: draft.roteiro || null,
          pilar_id: draft.pilar_id || null,
          data_publicacao: draft.data_publicacao,
          hora_publicacao: hora,
        },
      });
    },
    onSuccess: () => {
      toast.success("Card atualizado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveMut = useMutation({
    mutationFn: (status: ContentCardStatus) =>
      moveFn({
        data: {
          id: cardId,
          status,
          kanban_ordem: card?.kanban_ordem ?? 0,
        },
      }),
    onSuccess: () => {
      toast.success("Status atualizado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveMut = useMutation({
    mutationFn: () => archiveFn({ data: { id: cardId } }),
    onSuccess: () => {
      setArchiveOpen(false);
      toast.success("Card arquivado.");
      onClose();
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMut = useMutation({
    mutationFn: () => duplicateFn({ data: { id: cardId } }),
    onSuccess: () => {
      toast.success("Card duplicado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commentMut = useMutation({
    mutationFn: () => commentFn({ data: { card_id: cardId, mensagem: comment } }),
    onSuccess: () => {
      toast.success("Comentário registrado.");
      setComment("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startProductionMut = useMutation({
    mutationFn: () => markFn({ data: { id: cardId } }),
    onSuccess: (next: { id: string }) => {
      toast.success("Em produção.");
      onMutated();
      onClose();
      void navigate({
        to: "/admin/aprovacoes/producao/$cardId",
        params: { cardId: next.id },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMeta = card ? KANBAN_COLUMN_META[card.status] : null;
  const cardAttachments = detailQ.data?.attachments ?? [];
  const clientMaterials = cardAttachments.filter((asset) => asset.mediaRole === "cliente_material");
  const finalPreview = assetsForPublishPreview(cardAttachments, "final");
  const previewCtx =
    card &&
    buildPreviewContext(
      {
        formato: card.formato,
        plataforma: card.plataforma,
        legenda: captionValue || card.legenda,
        cliente_nome: card.cliente_nome,
        data_publicacao: card.data_publicacao,
        localizacao: card.localizacao,
      },
      finalPreview.length > 0 ? finalPreview : assetsForPublishPreview(cardAttachments, "draft"),
    );

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="flex max-h-[min(100dvh-1rem,96dvh)] w-[calc(100vw-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:rounded-xl [&>button]:right-4 [&>button]:top-4"
          onPointerDownOutside={(e) => {
            const t = e.target as HTMLElement | null;
            if (t?.closest("[data-radix-select-content]")) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            const t = e.target as HTMLElement | null;
            if (t?.closest("[data-radix-select-content]")) e.preventDefault();
          }}
        >
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle className="pr-8 text-left">{card?.titulo ?? "Carregando…"}</DialogTitle>
            <DialogDescription className="text-left">
              {card && (
                <span className="inline-flex items-center gap-2">
                  {statusMeta?.emoji} {KANBAN_COLUMNS.find((c) => c.status === card.status)?.label}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {detailQ.isLoading && (
            <div className="p-6">
              <ApprovalPanelSkeleton rows={5} />
            </div>
          )}

          {detailQ.isError && (
            <p className="p-6 text-sm text-destructive">Não foi possível carregar o card.</p>
          )}

          {card && (
            <>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4">
                <div className="mb-4 flex flex-wrap gap-2">
                  <div className="hidden sm:block">
                    <Select
                      value={card.status}
                      onValueChange={(v) => moveMut.mutate(v as ContentCardStatus)}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KANBAN_COLUMNS.filter((col) =>
                          canTransitionStatus(card.status, col.status),
                        ).map((col) => (
                          <SelectItem key={col.status} value={col.status}>
                            {KANBAN_COLUMN_META[col.status].emoji} {col.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <MobileStatusPicker
                    currentStatus={card.status}
                    onSelect={(s) => moveMut.mutate(s)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateMut.mutate()}
                    disabled={duplicateMut.isPending}
                  >
                    <Copy className="mr-1.5 h-4 w-4" />
                    Duplicar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setArchiveOpen(true)}
                    disabled={archiveMut.isPending || card.status === "arquivado"}
                  >
                    <Archive className="mr-1.5 h-4 w-4" />
                    Arquivar
                  </Button>
                </div>

                <Tabs
                  defaultValue={card.status === "aguardando_material" ? "arquivos" : "conteudo"}
                  className="min-h-0 flex-1"
                >
                  <TabsList className="mb-4 w-full justify-start">
                    <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
                    <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="comentarios">Comentários</TabsTrigger>
                  </TabsList>

                  <TabsContent value="conteudo" className="space-y-6">
                    {clientMaterials.length > 0 ? (
                      <SelectableMediaGallery assets={clientMaterials} />
                    ) : null}
                    {selectedPillar && <PillarBadge pillar={selectedPillar} />}
                    {(card.status === "publicado" || card.publish_status === "published") && (
                      <PublishedIgMetrics ig={publishedIg} />
                    )}
                    <RoteiroHtmlEditor
                      resetKey={card.id}
                      html={card.roteiro}
                      editable={card.status !== "arquivado"}
                      size="hero"
                      minHeightClass="min-h-[45vh]"
                      onChange={(html) => setDraft((d) => ({ ...d, roteiro: html }))}
                    />
                    <CaptionPanel
                      value={captionValue}
                      editable={card.status !== "arquivado"}
                      onChange={(value) => setDraft((d) => ({ ...d, legenda: value }))}
                    />
                    <BrDateTimeFields
                      date={draft.data_publicacao}
                      time={draft.hora_publicacao}
                      disabled={card.status === "arquivado"}
                      requiredDate
                      onDateChange={(iso) => setDraft((d) => ({ ...d, data_publicacao: iso }))}
                      onTimeChange={(hhmm) => setDraft((d) => ({ ...d, hora_publicacao: hhmm }))}
                    />
                    <div className="space-y-2">
                      <Label htmlFor="titulo">Título</Label>
                      <Input
                        id="titulo"
                        value={draft.titulo}
                        onChange={(e) => setDraft((d) => ({ ...d, titulo: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pilar editorial</Label>
                      {pillarsQ.isLoading ? (
                        <p className="text-sm text-muted-foreground">Carregando pilares…</p>
                      ) : pillarsQ.isError ? (
                        <p className="text-sm text-destructive">
                          Não foi possível carregar os pilares.
                          {pillarsQ.error instanceof Error ? ` ${pillarsQ.error.message}` : ""}
                        </p>
                      ) : (pillarsQ.data ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nenhum pilar ativo neste cliente. Crie em Conteúdos → Pilares.
                        </p>
                      ) : (
                        <Select
                          value={draft.pilar_id || "__none__"}
                          onValueChange={(v) =>
                            setDraft((d) => ({ ...d, pilar_id: v === "__none__" ? "" : v }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent position="popper" sideOffset={4}>
                            <SelectItem value="__none__">Sem pilar</SelectItem>
                            {(pillarsQ.data ?? []).map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.titulo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {previewCtx && (
                      <div className="rounded-xl border border-border p-3">
                        <Label className="mb-2 block">Preview</Label>
                        <MediaPreview context={previewCtx} />
                      </div>
                    )}
                    <Button
                      onClick={() => {
                        saveMut.mutate();
                      }}
                      disabled={saveMut.isPending}
                    >
                      Salvar alterações
                    </Button>
                  </TabsContent>

                  <TabsContent value="arquivos" className="space-y-6">
                    {clientMaterials.length > 0 ? (
                      <SelectableMediaGallery assets={clientMaterials} />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Quando o cliente enviar as mídias, elas aparecem aqui para download.
                      </p>
                    )}
                    <CardMediaUpload
                      cardId={cardId}
                      capaUrl={card.capa_url}
                      onUploaded={invalidate}
                    />
                  </TabsContent>

                  <TabsContent value="timeline">
                    <CardTimeline entries={detailQ.data?.events ?? []} />
                  </TabsContent>

                  <TabsContent value="comentarios" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="comment">Novo comentário</Label>
                      <Textarea
                        id="comment"
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Escreva um comentário…"
                      />
                      <Button
                        type="button"
                        onClick={() => commentMut.mutate()}
                        disabled={!comment.trim() || commentMut.isPending}
                      >
                        <MessageSquare className="mr-1.5 h-4 w-4" />
                        Comentar
                      </Button>
                    </div>
                    <div className="border-t border-border pt-4">
                      <h4 className="mb-3 text-sm font-medium">Histórico</h4>
                      <CardTimeline
                        entries={(detailQ.data?.events ?? []).filter(
                          (e) => e.eventType === "commented" || e.eventType === "updated",
                        )}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              {card.status === "aguardando_material" ? (
                <div className="shrink-0 border-t border-border bg-background px-6 py-3">
                  <Button
                    type="button"
                    size="lg"
                    className="h-12 w-full bg-[color:var(--success)] text-white hover:bg-[color:var(--success)]/90"
                    onClick={() => startProductionMut.mutate()}
                    disabled={startProductionMut.isPending}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Começar peça
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>

      <ApprovalConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Arquivar conteúdo?"
        description="O card sairá do Kanban ativo e ficará disponível na biblioteca como arquivado."
        confirmLabel="Arquivar"
        onConfirm={() => archiveMut.mutate()}
        loading={archiveMut.isPending}
        destructive
      />
    </>
  );
}
