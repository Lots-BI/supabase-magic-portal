import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, ClipboardCheck, Send, Undo2 } from "lucide-react";
import {
  getContentCard,
  listCardMedia,
  moveCard,
  requestFinalApprovalFn,
  updateCard,
} from "@/modules/approval/cards/cards.server";
import {
  buildNextProductionStep,
  requiredChecklistPending,
} from "@/modules/approval/services/build-next-production-step";
import { assetsForPublishPreview, buildPreviewContext, type MediaAsset } from "@/lib/media-preview";
import type { ContentCard, ContentCardStatus } from "@/modules/approval/types/content-card";
import { KANBAN_COLUMNS } from "@/modules/approval/workflow/column-config";
import {
  canTransitionStatus,
  isProducaoWorkspaceStatus,
} from "@/modules/approval/workflow/status-machine";
import {
  latestUnansweredChangeRequest,
  type TimelineEntry,
} from "@/modules/approval/services/build-card-timeline";
import { CardMediaUpload } from "../card/CardMediaUpload";
import { SelectableMediaGallery } from "../card/SelectableMediaGallery";
import { SocialPreviewPanel } from "../preview/SocialPreviewPanel";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";
import { BrDateTimeFields, horaToDbValue, isValidTime24h } from "../shared/BrDateTimeFields";
import { ChangeRequestBanner } from "../shared/ChangeRequestBanner";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminConteudosCalendarHref } from "@/modules/approval/services/admin-conteudos-href";
import { KANBAN_COLUMN_META } from "../kanban/kanban-meta";

const LEGENDA_DEBOUNCE_MS = 800;

type CardDetailPayload = {
  card: ContentCard;
  attachments?: MediaAsset[];
  events?: TimelineEntry[];
};

type CardMediaPayload = { media: MediaAsset[] };

export function ProductionWorkspace({ cardId, backTo }: { cardId: string; backTo: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const getFn = useServerFn(getContentCard);
  const listMediaFn = useServerFn(listCardMedia);
  const updateFn = useServerFn(updateCard);
  const moveFn = useServerFn(moveCard);
  const requestApprovalFn = useServerFn(requestFinalApprovalFn);

  const [legenda, setLegenda] = useState("");
  const [dataPub, setDataPub] = useState("");
  const [horaPub, setHoraPub] = useState("16:00");
  const legendaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detailQ = useQuery({
    queryKey: ["content-card", cardId],
    queryFn: async () => (await getFn({ data: { id: cardId } })) as CardDetailPayload,
    enabled: !!cardId,
  });

  const mediaQ = useQuery({
    queryKey: ["content-card-media", cardId],
    queryFn: async (): Promise<CardMediaPayload> =>
      (await listMediaFn({
        data: { cardId, capaUrl: detailQ.data?.card.capa_url ?? null },
      })) as CardMediaPayload,
    enabled: !!cardId && !!detailQ.data?.card,
  });

  const card = detailQ.data?.card;

  useEffect(() => {
    if (card) {
      setLegenda(card.legenda ?? "");
      setDataPub(card.data_publicacao);
      setHoraPub(card.hora_publicacao?.slice(0, 5) || "16:00");
    }
  }, [card?.id, card?.legenda, card?.data_publicacao, card?.hora_publicacao]);

  useEffect(
    () => () => {
      if (legendaTimeoutRef.current) clearTimeout(legendaTimeoutRef.current);
      if (scheduleTimeoutRef.current) clearTimeout(scheduleTimeoutRef.current);
    },
    [],
  );

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["content-card", cardId] });
    qc.invalidateQueries({ queryKey: ["content-card-media", cardId] });
    qc.invalidateQueries({ queryKey: ["approval"] });
  }, [qc, cardId]);

  const saveLegenda = useCallback(
    (value: string) => {
      updateFn({ data: { id: cardId, legenda: value || null } })
        .then(() => invalidate())
        .catch((e: Error) => toast.error(e.message));
    },
    [cardId, updateFn, invalidate],
  );

  const scheduleLegendaSave = (value: string) => {
    if (legendaTimeoutRef.current) clearTimeout(legendaTimeoutRef.current);
    legendaTimeoutRef.current = setTimeout(() => saveLegenda(value), LEGENDA_DEBOUNCE_MS);
  };

  const saveSchedule = useCallback(
    (date: string, time: string) => {
      if (!date) return;
      const hora = horaToDbValue(time);
      if (hora === false) return;
      updateFn({ data: { id: cardId, data_publicacao: date, hora_publicacao: hora } })
        .then(() => invalidate())
        .catch((e: Error) => toast.error(e.message));
    },
    [cardId, updateFn, invalidate],
  );

  const requestApprovalMut = useMutation({
    mutationFn: () => {
      if (!dataPub) {
        return Promise.reject(new Error("Informe a data de publicação."));
      }
      if (!isValidTime24h(horaPub)) {
        return Promise.reject(new Error("Informe um horário válido (HH:mm)."));
      }
      return requestApprovalFn({
        data: {
          id: cardId,
          data_publicacao: dataPub,
          hora_publicacao: `${horaPub}:00`,
        },
      });
    },
    onSuccess: () => {
      toast.success("Enviado ao cliente já como agendamento.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveMut = useMutation({
    mutationFn: (status: ContentCardStatus) => {
      if (!card) return Promise.reject(new Error("Card não encontrado"));
      return moveFn({
        data: { id: cardId, status, kanban_ordem: card.kanban_ordem },
      });
    },
    onSuccess: (moved: ContentCard) => {
      toast.success("Status atualizado.");
      invalidate();
      if (!isProducaoWorkspaceStatus(moved.status)) {
        void navigate(adminConteudosCalendarHref(moved.cadastro_cliente_id));
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nextStep = card ? buildNextProductionStep(card) : null;
  const pendingRequired = card
    ? requiredChecklistPending(card.checklist).filter((item) => item.id !== "preview_ok")
    : [];
  const pendingLabels = pendingRequired.map((p) => p.label).join(", ");

  const allMedia = mediaQ.data?.media ?? detailQ.data?.attachments ?? [];
  const clientMaterial = allMedia.filter((m) => m.mediaRole === "cliente_material");
  const previewCtx =
    card &&
    buildPreviewContext(
      {
        formato: card.formato,
        plataforma: card.plataforma,
        legenda: legenda || card.legenda,
        cliente_nome: card.cliente_nome,
        data_publicacao: card.data_publicacao,
        localizacao: card.localizacao,
      },
      assetsForPublishPreview(allMedia, "final"),
    );

  if (detailQ.isLoading) {
    return (
      <div className="space-y-6">
        <ApprovalPanelSkeleton rows={6} />
      </div>
    );
  }

  if (detailQ.isError || !card) {
    return (
      <div className="space-y-4">
        <Button variant="outline" asChild>
          <Link to={backTo}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <p className="text-sm text-destructive">Não foi possível carregar a produção.</p>
      </div>
    );
  }

  const backLink = adminConteudosCalendarHref(card.cadastro_cliente_id);
  const changeRequest = latestUnansweredChangeRequest(detailQ.data?.events ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conteúdos"
        title={card.titulo}
        description="Workspace de produção"
        actions={
          <Button variant="outline" asChild>
            <Link {...backLink}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao calendário
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={card.status}
          onValueChange={(v) => moveMut.mutate(v as ContentCardStatus)}
          disabled={moveMut.isPending}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KANBAN_COLUMNS.filter((col) => canTransitionStatus(card.status, col.status)).map(
              (col) => (
                <SelectItem key={col.status} value={col.status}>
                  {KANBAN_COLUMN_META[col.status].emoji} {col.label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        {canTransitionStatus(card.status, "aguardando_material") ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => moveMut.mutate("aguardando_material")}
            disabled={moveMut.isPending}
          >
            <Undo2 className="mr-2 h-4 w-4" />
            Mídia enviada
          </Button>
        ) : null}
      </div>

      {changeRequest && <ChangeRequestBanner entry={changeRequest} />}

      {nextStep && (
        <SectionCard title="Próximo passo" eyebrow="Produção">
          <p className="font-medium text-foreground">{nextStep.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{nextStep.body}</p>
        </SectionCard>
      )}

      <SectionCard
        title="Mídia final"
        description="Peça editada pela agência, pronta para publicar. Só o admin envia aqui — o original do cliente fica na seção abaixo."
      >
        <CardMediaUpload
          cardId={cardId}
          capaUrl={card.capa_url}
          mediaRole="final"
          onUploaded={invalidate}
        />
      </SectionCard>

      <SectionCard
        title="Material do cliente"
        description="Originais enviados com o roteiro. Não são a peça final — baixe para editar sem perda de qualidade."
      >
        {clientMaterial.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum original do cliente neste card.</p>
        ) : (
          <SelectableMediaGallery assets={clientMaterial} />
        )}
      </SectionCard>

      <SectionCard title="Legenda">
        <div className="space-y-2">
          <Label htmlFor="legenda-prod">Texto da publicação</Label>
          <Textarea
            id="legenda-prod"
            rows={4}
            value={legenda}
            onChange={(e) => {
              setLegenda(e.target.value);
              scheduleLegendaSave(e.target.value);
            }}
            onBlur={() => saveLegenda(legenda)}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Agendamento"
        description="Altere a qualquer momento. A aprovação do cliente agenda no Lots nesta data e hora. O Instagram só recebe o post nesse momento."
      >
        <BrDateTimeFields
          date={dataPub}
          time={horaPub}
          requiredDate
          onDateChange={(iso) => {
            setDataPub(iso);
            saveSchedule(iso, horaPub);
          }}
          onTimeChange={(hhmm) => {
            setHoraPub(hhmm);
            if (scheduleTimeoutRef.current) clearTimeout(scheduleTimeoutRef.current);
            scheduleTimeoutRef.current = setTimeout(() => saveSchedule(dataPub, hhmm), 500);
          }}
        />
      </SectionCard>

      {previewCtx && (
        <SectionCard title="Preview">
          <SocialPreviewPanel context={previewCtx} phone />
        </SectionCard>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => requestApprovalMut.mutate()}
          disabled={requestApprovalMut.isPending}
          title={pendingRequired.length > 0 ? `Pendente: ${pendingLabels}` : undefined}
        >
          <Send className="mr-2 h-4 w-4" />
          Pedir ok
        </Button>
        {pendingRequired.length > 0 && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Complete: {pendingLabels}
          </p>
        )}
      </div>
    </div>
  );
}
