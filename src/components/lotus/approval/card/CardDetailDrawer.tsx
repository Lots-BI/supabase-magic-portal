import { useEffect, useMemo, useState } from "react";
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
  moveCard,
  publishCardToMeta,
  updateCard,
  listEditorialPillars,
} from "@/modules/approval/cards/cards.server";
import type { ContentCardStatus } from "@/modules/approval/types/content-card";
import { isMetaLivePublishPlatform, readMetaPublishFromMetadata } from "@/modules/approval/integrations/meta/meta-publish-helpers";
import { KANBAN_COLUMNS } from "@/modules/approval/workflow/column-config";
import { canTransitionStatus } from "@/modules/approval/workflow/status-machine";
import { CardTimeline } from "./CardTimeline";
import { CardMediaUpload } from "./CardMediaUpload";
import { MobileStatusPicker } from "../kanban/MobileStatusPicker";
import { KANBAN_COLUMN_META } from "../kanban/kanban-meta";
import { MediaPreview } from "@/components/lotus/MediaPreview/MediaPreview";
import { buildPreviewContext } from "@/lib/media-preview";
import { Copy, Archive, MessageSquare, Share2, ExternalLink } from "lucide-react";
import { PillarBadge } from "../shared/PillarBadge";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";
import { ApprovalConfirmDialog } from "../shared/ApprovalConfirmDialog";

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
  const getFn = useServerFn(getContentCard);
  const updateFn = useServerFn(updateCard);
  const moveFn = useServerFn(moveCard);
  const publishFn = useServerFn(publishCardToMeta);
  const archiveFn = useServerFn(archiveCard);
  const duplicateFn = useServerFn(duplicateCard);
  const commentFn = useServerFn(commentCard);
  const pillarsFn = useServerFn(listEditorialPillars);

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
  }, [card]);

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
    mutationFn: () =>
      updateFn({
        data: {
          id: cardId,
          titulo: draft.titulo,
          legenda: draft.legenda || null,
          copy_text: draft.copy_text || null,
          roteiro: draft.roteiro || null,
          direcao_arte: draft.direcao_arte || null,
          cta: draft.cta || null,
          observacoes: draft.observacoes || null,
          pilar_id: draft.pilar_id,
          data_publicacao: draft.data_publicacao,
          hora_publicacao: draft.hora_publicacao || null,
        },
      }),
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

  const publishMut = useMutation({
    mutationFn: () => publishFn({ data: { id: cardId, target: "facebook" } }),
    onSuccess: (result) => {
      toast.success(
        result.publish.url
          ? "Publicado no Facebook."
          : `Publicado no Facebook (id ${result.publish.externalId}).`,
      );
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

  const toggleChecklist = (itemId: string) => {
    if (!card) return;
    const checklist = card.checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item,
    );
    updateFn({ data: { id: cardId, checklist } }).then(() => invalidate());
  };

  const statusMeta = card ? KANBAN_COLUMN_META[card.status] : null;
  const metaPublish = card ? readMetaPublishFromMetadata(card.integration_metadata ?? {}) : null;
  const canLivePublish =
    !!card && card.status === "aprovado" && isMetaLivePublishPlatform(card.plataforma);
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
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        {detailQ.isLoading && (
          <div className="p-6">
            <ApprovalPanelSkeleton rows={5} />
          </div>
        )}

        {detailQ.isError && (
          <p className="p-6 text-sm text-destructive">Não foi possível carregar o card.</p>
        )}

        {card && (
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
              <MobileStatusPicker currentStatus={card.status} onSelect={(s) => moveMut.mutate(s)} />
              {canLivePublish && (
                <Button
                  type="button"
                  size="sm"
                  className="lotus-focus"
                  onClick={() => publishMut.mutate()}
                  disabled={publishMut.isPending}
                >
                  <Share2 className="mr-1.5 h-4 w-4" />
                  {publishMut.isPending ? "Publicando…" : "Publicar no Facebook"}
                </Button>
              )}
              {card.plataforma.toLowerCase() === "instagram" && card.status === "aprovado" && (
                <p className="w-full text-[11px] text-muted-foreground">
                  Instagram live ainda não está no MVP — use Facebook ou marque Publicado no
                  Kanban (local).
                </p>
              )}
              {metaPublish?.url && (
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={metaPublish.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Ver no Facebook
                  </a>
                </Button>
              )}
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

            <Tabs defaultValue="conteudo" className="min-h-0 flex-1">
              <TabsList className="mb-4 w-full justify-start">
                <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
                <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="comentarios">Comentários</TabsTrigger>
              </TabsList>

              <TabsContent value="conteudo" className="space-y-4">
                {selectedPillar && <PillarBadge pillar={selectedPillar} />}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="data-pub">Data publicação</Label>
                    <Input
                      id="data-pub"
                      type="date"
                      value={draft.data_publicacao}
                      onChange={(e) => setDraft((d) => ({ ...d, data_publicacao: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hora-pub">Hora</Label>
                    <Input
                      id="hora-pub"
                      type="time"
                      value={draft.hora_publicacao}
                      onChange={(e) => setDraft((d) => ({ ...d, hora_publicacao: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    value={draft.titulo}
                    onChange={(e) => setDraft((d) => ({ ...d, titulo: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pilar editorial *</Label>
                  <Select
                    value={draft.pilar_id}
                    onValueChange={(v) => setDraft((d) => ({ ...d, pilar_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(pillarsQ.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="copy">Copy</Label>
                  <Textarea
                    id="copy"
                    rows={3}
                    value={draft.copy_text}
                    onChange={(e) => setDraft((d) => ({ ...d, copy_text: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legenda">Legenda</Label>
                  <Textarea
                    id="legenda"
                    rows={3}
                    value={draft.legenda}
                    onChange={(e) => setDraft((d) => ({ ...d, legenda: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roteiro">Roteiro</Label>
                  <Textarea
                    id="roteiro"
                    rows={3}
                    value={draft.roteiro}
                    onChange={(e) => setDraft((d) => ({ ...d, roteiro: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direcao">Direção de Arte</Label>
                  <Textarea
                    id="direcao"
                    rows={2}
                    value={draft.direcao_arte}
                    onChange={(e) => setDraft((d) => ({ ...d, direcao_arte: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta">CTA</Label>
                  <Input
                    id="cta"
                    value={draft.cta}
                    onChange={(e) => setDraft((d) => ({ ...d, cta: e.target.value }))}
                  />
                </div>
                {card.checklist.length > 0 && (
                  <div className="space-y-2">
                    <Label>Checklist</Label>
                    <ul className="space-y-2">
                      {card.checklist.map((item) => (
                        <li key={item.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => toggleChecklist(item.id)}
                            className="rounded border-border"
                          />
                          <span className={item.done ? "text-muted-foreground line-through" : ""}>
                            {item.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {previewCtx && (
                  <div className="rounded-xl border border-border p-3">
                    <Label className="mb-2 block">Preview</Label>
                    <MediaPreview context={previewCtx} />
                  </div>
                )}
                <Button
                  onClick={() => {
                    if (!draft.pilar_id) {
                      toast.error("Selecione um pilar editorial.");
                      return;
                    }
                    saveMut.mutate();
                  }}
                  disabled={saveMut.isPending}
                >
                  Salvar alterações
                </Button>
              </TabsContent>

              <TabsContent value="arquivos">
                <CardMediaUpload cardId={cardId} capaUrl={card.capa_url} onUploaded={invalidate} />
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
        )}
      </SheetContent>
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
    </Sheet>
  );
}
