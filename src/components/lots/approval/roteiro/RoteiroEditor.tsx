import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { getContentCard, moveCard, updateCard } from "@/modules/approval/cards/cards.server";
import { getClientContentCard } from "@/modules/approval/cards/client-cards.server";
import {
  FORMAT_LABEL,
  type ContentCard,
  type ContentCardStatus,
  type ContentFormato,
} from "@/modules/approval/types/content-card";
import { KANBAN_COLUMNS } from "@/modules/approval/workflow/column-config";
import { isRoteiroWorkspaceStatus } from "@/modules/approval/workflow/status-machine";
import {
  latestUnansweredChangeRequest,
  type TimelineEntry,
} from "@/modules/approval/services/build-card-timeline";
import { isRoteiroHtmlEmpty } from "@/modules/approval/services/roteiro-scenes";
import { KANBAN_COLUMN_META, formatCardSchedule } from "../kanban/kanban-meta";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";
import { BrDateTimeFields, horaToDbValue } from "../shared/BrDateTimeFields";
import { ChangeRequestBanner } from "../shared/ChangeRequestBanner";
import { RoteiroHtmlEditor } from "./RoteiroHtmlEditor";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminConteudosCalendarHref } from "@/modules/approval/services/admin-conteudos-href";

type CardDetailPayload = { card: ContentCard; events?: TimelineEntry[] };

const SAVE_DEBOUNCE_MS = 800;
const SCHEDULE_DEBOUNCE_MS = 500;

export function RoteiroEditor({
  cardId,
  mode,
  backTo,
}: {
  cardId: string;
  mode: "admin" | "client";
  backTo: string;
}) {
  const qc = useQueryClient();
  const getAdminFn = useServerFn(getContentCard);
  const getClientFn = useServerFn(getClientContentCard);
  const updateFn = useServerFn(updateCard);
  const moveFn = useServerFn(moveCard);

  const [dataPub, setDataPub] = useState("");
  const [horaPub, setHoraPub] = useState("");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const htmlRef = useRef("");

  const queryKey = mode === "admin" ? ["content-card", cardId] : ["client-content-card", cardId];

  const detailQ = useQuery({
    queryKey,
    queryFn: async () =>
      (mode === "admin"
        ? await getAdminFn({ data: { id: cardId } })
        : await getClientFn({ data: { id: cardId } })) as CardDetailPayload,
    enabled: !!cardId,
  });

  const card = detailQ.data?.card;

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey });
  }, [qc, queryKey]);

  const invalidateBoards = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["approval"] });
  }, [qc]);

  const scheduleSave = useCallback(
    (html: string) => {
      if (mode !== "admin") return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        updateFn({ data: { id: cardId, roteiro: html || null } })
          .then(() => invalidate())
          .catch((e: Error) => toast.error(e.message));
      }, SAVE_DEBOUNCE_MS);
    },
    [mode, cardId, updateFn, invalidate],
  );

  useEffect(() => {
    htmlRef.current = card?.roteiro ?? "";
  }, [card?.id, card?.roteiro]);

  const persistSchedule = useCallback(
    (date: string, time: string) => {
      if (mode !== "admin") return;
      if (!date) return;
      const hora = horaToDbValue(time);
      if (hora === false) return;
      updateFn({ data: { id: cardId, data_publicacao: date, hora_publicacao: hora } })
        .then(() => {
          invalidate();
          invalidateBoards();
        })
        .catch((e: Error) => toast.error(e.message));
    },
    [mode, cardId, updateFn, invalidate, invalidateBoards],
  );

  useEffect(() => {
    if (!card) return;
    setDataPub(card.data_publicacao);
    setHoraPub(card.hora_publicacao?.slice(0, 5) ?? "");
  }, [card?.id, card?.data_publicacao, card?.hora_publicacao]);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (scheduleTimeoutRef.current) clearTimeout(scheduleTimeoutRef.current);
    },
    [],
  );

  const sendApprovalMut = useMutation({
    mutationFn: async () => {
      if (!card) return;
      if (!isRoteiroWorkspaceStatus(card.status)) {
        throw new Error("Só é possível enviar conteúdos em Roteiro ou em Alterações.");
      }
      const html = htmlRef.current.trim();
      if (isRoteiroHtmlEmpty(html)) {
        throw new Error("Escreva o roteiro antes de enviar para aprovação.");
      }
      if (!dataPub) {
        throw new Error("Informe a data de publicação.");
      }
      const hora = horaToDbValue(horaPub);
      if (hora === false) {
        throw new Error("Informe um horário válido (HH:mm).");
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (scheduleTimeoutRef.current) {
        clearTimeout(scheduleTimeoutRef.current);
        scheduleTimeoutRef.current = null;
      }
      await updateFn({
        data: {
          id: cardId,
          roteiro: html,
          data_publicacao: dataPub,
          hora_publicacao: hora,
        },
      });
      await moveFn({
        data: {
          id: cardId,
          status: "aguardando_aprovacao",
          kanban_ordem: card.kanban_ordem,
        },
      });
    },
    onSuccess: () => {
      toast.success("Enviado para aprovação do cliente.");
      invalidate();
      invalidateBoards();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMeta = card ? KANBAN_COLUMN_META[card.status as ContentCardStatus] : null;
  const statusLabel = card
    ? (KANBAN_COLUMNS.find((c) => c.status === card.status)?.label ?? card.status)
    : "";
  const formatoLabel =
    card?.formato && card.formato in FORMAT_LABEL
      ? FORMAT_LABEL[card.formato as ContentFormato]
      : card?.formato;

  const showStaffCta = mode === "admin" && card ? isRoteiroWorkspaceStatus(card.status) : false;
  const canEditSchedule = mode === "admin" && card?.status !== "arquivado";
  const changeRequest = latestUnansweredChangeRequest(detailQ.data?.events ?? []);

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
        <p className="text-sm text-destructive">Não foi possível carregar o roteiro.</p>
      </div>
    );
  }

  const backLink =
    mode === "admin"
      ? adminConteudosCalendarHref(card.cadastro_cliente_id)
      : { to: backTo as "/aprovacoes" };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conteúdos"
        title={card.titulo}
        description={`No calendário em ${formatCardSchedule(dataPub || card.data_publicacao, horaPub || card.hora_publicacao)}`}
        actions={
          <Button variant="outline" asChild>
            <Link {...backLink}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao calendário
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{card.cliente_nome}</Badge>
        <Badge variant="outline">
          {formatCardSchedule(dataPub || card.data_publicacao, horaPub || card.hora_publicacao)}
        </Badge>
        {formatoLabel && <Badge variant="outline">{formatoLabel}</Badge>}
        {card.linha_editorial && <Badge variant="outline">{card.linha_editorial}</Badge>}
        {card.tema && <Badge variant="outline">{card.tema}</Badge>}
        <Badge variant="outline" className="gap-1">
          {statusMeta?.emoji} {statusLabel}
        </Badge>
      </div>

      {changeRequest && <ChangeRequestBanner entry={changeRequest} />}

      {mode === "admin" && (
        <SectionCard
          title="Data e horário de publicação"
          description="Pode alterar a qualquer momento, inclusive antes da aprovação do cliente. Salva automaticamente."
        >
          <BrDateTimeFields
            date={dataPub}
            time={horaPub}
            disabled={!canEditSchedule}
            requiredDate
            onDateChange={(iso) => {
              setDataPub(iso);
              persistSchedule(iso, horaPub);
            }}
            onTimeChange={(hhmm) => {
              setHoraPub(hhmm);
              if (scheduleTimeoutRef.current) clearTimeout(scheduleTimeoutRef.current);
              scheduleTimeoutRef.current = setTimeout(
                () => persistSchedule(dataPub, hhmm),
                SCHEDULE_DEBOUNCE_MS,
              );
            }}
          />
        </SectionCard>
      )}

      {mode === "admin" ? (
        <RoteiroHtmlEditor
          resetKey={card.id}
          html={card.roteiro}
          editable
          minHeightClass="min-h-[420px]"
          onChange={(html) => {
            htmlRef.current = html;
            scheduleSave(html);
          }}
        />
      ) : (
        <RoteiroHtmlEditor resetKey={card.id} html={card.roteiro || card.copy_text} editable={false} />
      )}

      {showStaffCta && (
        <div className="sticky bottom-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="lg"
            className="h-14 flex-1 bg-[color:var(--success)] text-white hover:bg-[color:var(--success)]/90 sm:flex-none"
            onClick={() => sendApprovalMut.mutate()}
            disabled={sendApprovalMut.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            {sendApprovalMut.isPending ? "Enviando…" : "Mandar ao cliente"}
          </Button>
        </div>
      )}
    </div>
  );
}
