import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, ClipboardCheck, Download, Send } from "lucide-react";
import { formatBytes } from "@/modules/approval/services/material-upload";
import {
  getContentCard,
  listCardMedia,
  requestFinalApprovalFn,
  updateCard,
} from "@/modules/approval/cards/cards.server";
import {
  buildNextProductionStep,
  requiredChecklistPending,
} from "@/modules/approval/services/build-next-production-step";
import { assetsForPublishPreview, buildPreviewContext, type MediaAsset } from "@/lib/media-preview";
import type { ChecklistItem, ContentCard } from "@/modules/approval/types/content-card";
import { CardMediaUpload } from "../card/CardMediaUpload";
import { SocialPreviewPanel } from "../preview/SocialPreviewPanel";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";
import { BrDateTimeFields, horaToDbValue, isValidTime24h } from "../shared/BrDateTimeFields";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { adminConteudosCalendarHref } from "@/modules/approval/services/admin-conteudos-href";

const LEGENDA_DEBOUNCE_MS = 800;

type CardDetailPayload = {
  card: ContentCard;
  attachments?: MediaAsset[];
};

type CardMediaPayload = { media: MediaAsset[] };

export function ProductionWorkspace({ cardId, backTo }: { cardId: string; backTo: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getContentCard);
  const listMediaFn = useServerFn(listCardMedia);
  const updateFn = useServerFn(updateCard);
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

  const togglePreviewOk = (itemId: string) => {
    if (!card || itemId !== "preview_ok") return;
    const checklist = card.checklist.map((item: ChecklistItem) =>
      item.id === itemId ? { ...item, done: !item.done } : item,
    );
    updateFn({ data: { id: cardId, checklist } })
      .then(() => {
        toast.success("Checklist atualizado.");
        invalidate();
      })
      .catch((e: Error) => toast.error(e.message));
  };

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

  const nextStep = card ? buildNextProductionStep(card) : null;
  const pendingRequired = card ? requiredChecklistPending(card.checklist) : [];
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

      {nextStep && (
        <SectionCard title="Próximo passo" eyebrow="Produção">
          <p className="font-medium text-foreground">{nextStep.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{nextStep.body}</p>
        </SectionCard>
      )}

      {card.checklist.length > 0 && (
        <SectionCard title="Checklist" description="Itens obrigatórios para publicação.">
          <ul className="space-y-2">
            {card.checklist.map((item: ChecklistItem) => {
              const isPreviewOk = item.id === "preview_ok";
              return (
                <li key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.done}
                    disabled={!isPreviewOk}
                    onChange={() => togglePreviewOk(item.id)}
                    className={cn(
                      "rounded border-border",
                      !isPreviewOk && "cursor-not-allowed opacity-60",
                    )}
                  />
                  <span className={item.done ? "text-muted-foreground line-through" : ""}>
                    {item.label}
                    {item.auto && (
                      <span className="ml-1 text-xs text-muted-foreground">(automático)</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
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
        ) : null}
        {clientMaterial.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {clientMaterial.map((m: MediaAsset) => (
              <li
                key={m.id}
                className="overflow-hidden rounded-lg border border-border bg-muted/30"
              >
                {m.kind === "video" ? (
                  <video src={m.url} className="aspect-square w-full object-cover" controls muted />
                ) : (
                  <img src={m.url} alt="" className="aspect-square w-full object-cover" />
                )}
                <div className="flex items-center justify-between gap-2 p-2">
                  <span className="truncate text-[11px] text-muted-foreground">
                    {m.fileName ?? "arquivo"}
                    {m.fileSize ? ` · ${formatBytes(m.fileSize)}` : ""}
                  </span>
                  {m.downloadUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0"
                      asChild
                    >
                      <a href={m.downloadUrl} download={m.fileName ?? undefined}>
                        <Download className="mr-1 h-3.5 w-3.5" />
                        Baixar
                      </a>
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
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
          <SocialPreviewPanel context={previewCtx} />
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
          Enviar para aprovação com horário
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
