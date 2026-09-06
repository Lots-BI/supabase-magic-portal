import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw, Send } from "lucide-react";
import {
  getContentCard,
  moveCard,
  updateCard,
} from "@/modules/approval/cards/cards.server";
import {
  clientRequestChangesFn,
  getClientContentCard,
} from "@/modules/approval/cards/client-cards.server";
import {
  FORMAT_LABEL,
  type ContentCard,
  type ContentCardStatus,
  type ContentFormato,
} from "@/modules/approval/types/content-card";
import { KANBAN_COLUMNS } from "@/modules/approval/workflow/column-config";
import { KANBAN_COLUMN_META, formatCardSchedule } from "../kanban/kanban-meta";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";
import { PageHeader } from "@/components/lots/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { adminConteudosCalendarHref } from "@/modules/approval/services/admin-conteudos-href";

type CardDetailPayload = { card: ContentCard };

const SAVE_DEBOUNCE_MS = 800;

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
  const changesFn = useServerFn(clientRequestChangesFn);

  const [changeNote, setChangeNote] = useState("");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

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

  const editor = useEditor({
    extensions: [StarterKit],
    content: card?.roteiro ?? "",
    editable: mode === "admin",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[280px] px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => scheduleSave(ed.getHTML()),
  });

  useEffect(() => {
    if (!editor || !card || initializedRef.current) return;
    editor.commands.setContent(card.roteiro ?? "", { emitUpdate: false });
    editor.setEditable(mode === "admin");
    initializedRef.current = true;
  }, [editor, card, mode]);

  useEffect(() => {
    initializedRef.current = false;
  }, [cardId]);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    },
    [],
  );

  const sendApprovalMut = useMutation({
    mutationFn: async () => {
      if (!card) return;
      if (card.status !== "roteiro") {
        throw new Error("Só é possível enviar conteúdos em Roteiro.");
      }
      const html = editor?.getHTML()?.trim() ?? "";
      if (!html || html === "<p></p>") {
        throw new Error("Escreva o roteiro antes de enviar para aprovação.");
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      await updateFn({ data: { id: cardId, roteiro: html } });
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

  const statusMeta = card ? KANBAN_COLUMN_META[card.status as ContentCardStatus] : null;
  const statusLabel = card
    ? (KANBAN_COLUMNS.find((c) => c.status === card.status)?.label ?? card.status)
    : "";
  const formatoLabel =
    card?.formato && card.formato in FORMAT_LABEL
      ? FORMAT_LABEL[card.formato as ContentFormato]
      : card?.formato;

  const showStaffCta = mode === "admin" && card?.status === "roteiro";
  const showStaffWaiting =
    mode === "admin" && card?.status === "aguardando_aprovacao";
  const showClientCta = mode === "client" && card?.status === "aguardando_aprovacao";

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
        description={`No calendário em ${formatCardSchedule(card.data_publicacao, card.hora_publicacao)}`}
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
          {formatCardSchedule(card.data_publicacao, card.hora_publicacao)}
        </Badge>
        {formatoLabel && <Badge variant="outline">{formatoLabel}</Badge>}
        {card.linha_editorial && <Badge variant="outline">{card.linha_editorial}</Badge>}
        {card.tema && <Badge variant="outline">{card.tema}</Badge>}
        <Badge variant="outline" className="gap-1">
          {statusMeta?.emoji} {statusLabel}
        </Badge>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card",
          mode === "client" && "bg-muted/20",
        )}
      >
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="min-h-[280px] p-4 text-sm text-muted-foreground">Carregando editor…</div>
        )}
      </div>

      {showStaffCta && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => sendApprovalMut.mutate()}
            disabled={sendApprovalMut.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            {sendApprovalMut.isPending ? "Enviando…" : "Enviar para aprovação"}
          </Button>
        </div>
      )}

      {showStaffWaiting && (
        <p className="text-sm text-muted-foreground">
          Aguardando o cliente aprovar o roteiro e enviar as mídias gravadas.
        </p>
      )}

      {showClientCta && (
        <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">
            Para aprovar, volte ao calendário, anexe as mídias gravadas e clique em Aprovar.
          </p>
          <div className="space-y-2">
            <Textarea
              placeholder="Descreva as alterações desejadas…"
              rows={3}
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
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
              Pedir alterações
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}