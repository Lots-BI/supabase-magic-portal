import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/lots/EmptyState";
import type { PeriodDays } from "@/components/lots/PeriodToggle";
import { CommentReplyBox } from "@/components/lots/crm/CommentReplyBox";
import { crmKeys } from "@/modules/crm/query-keys";
import { placeLabel } from "@/modules/crm/present";
import type { CrmThreadReply } from "@/modules/crm/comment-threads";
import {
  deleteCrmCommentFn,
  hideCrmCommentFn,
  listCrmCommentsFn,
  privateReplyCrmCommentFn,
  replyCrmCommentFn,
  type CrmCommentFeedThread,
} from "@/modules/crm/crm.server";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initialOf(name: string) {
  return name.replace(/^@/, "").charAt(0).toUpperCase() || "?";
}

type CommentActions = {
  reply: (signalId: string, message: string) => Promise<void>;
  privateReply: (signalId: string, message: string) => Promise<void>;
  setHidden: (signalId: string, hide: boolean) => Promise<void>;
  remove: (signalId: string) => Promise<void>;
};

function useCommentActions(): CommentActions {
  const qc = useQueryClient();
  const replyFn = useServerFn(replyCrmCommentFn);
  const privateFn = useServerFn(privateReplyCrmCommentFn);
  const hideFn = useServerFn(hideCrmCommentFn);
  const deleteFn = useServerFn(deleteCrmCommentFn);
  const refresh = () => void qc.invalidateQueries({ queryKey: ["crm"] });

  const replyMut = useMutation({
    mutationFn: (input: { signalId: string; message: string }) => replyFn({ data: input }),
    onSuccess: refresh,
  });
  const privateMut = useMutation({
    mutationFn: (input: { signalId: string; message: string }) => privateFn({ data: input }),
    onSuccess: refresh,
  });
  const hideMut = useMutation({
    mutationFn: (input: { signalId: string; hide: boolean }) => hideFn({ data: input }),
    onSuccess: refresh,
  });
  const deleteMut = useMutation({
    mutationFn: (input: { signalId: string }) => deleteFn({ data: input }),
    onSuccess: refresh,
  });

  return {
    reply: async (signalId, message) => {
      await replyMut.mutateAsync({ signalId, message });
    },
    privateReply: async (signalId, message) => {
      await privateMut.mutateAsync({ signalId, message });
    },
    setHidden: async (signalId, hide) => {
      try {
        await hideMut.mutateAsync({ signalId, hide });
        toast.success(hide ? "Comentário oculto no Instagram." : "Comentário visível de novo.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao ocultar o comentário.");
      }
    },
    remove: async (signalId) => {
      try {
        await deleteMut.mutateAsync({ signalId });
        toast.success("Comentário excluído do Instagram.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao excluir o comentário.");
      }
    },
  };
}

function Avatar({ name, brand }: { name: string; brand?: boolean }) {
  return (
    <span
      aria-hidden
      className={
        brand
          ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
      }
    >
      {initialOf(name)}
    </span>
  );
}

function ActionLink({
  children,
  onClick,
  destructive,
}: {
  children: ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        destructive
          ? "min-h-9 text-xs font-medium text-destructive hover:underline"
          : "min-h-9 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
      }
    >
      {children}
    </button>
  );
}

function DeleteConfirm({
  open,
  onOpenChange,
  fromBrand,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromBrand: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {fromBrand ? "Excluir a resposta da marca?" : "Excluir este comentário?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Sai do Instagram de vez e não volta. Para só tirar da vista do público, prefira Ocultar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type Composer = "reply" | "private" | null;

function CommentBody({
  signalId,
  personName,
  body,
  occurredAt,
  hidden,
  fromBrand,
  brandName,
  canWrite,
  canPrivateReply,
  privateReplied,
  replyPrefill,
  showReplyLink = true,
  actions,
  badges,
}: {
  signalId: string;
  personName: string;
  body: string | null;
  occurredAt: string;
  hidden: boolean;
  fromBrand: boolean;
  brandName: string;
  canWrite: boolean;
  canPrivateReply: boolean;
  privateReplied: boolean;
  replyPrefill: string;
  showReplyLink?: boolean;
  actions: CommentActions;
  badges?: ReactNode;
}) {
  const [composer, setComposer] = useState<Composer>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex gap-3">
      <Avatar name={fromBrand ? brandName : personName} brand={fromBrand} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold">{fromBrand ? brandName : personName}</span>
          {fromBrand ? <Badge variant="secondary">Marca</Badge> : null}
          <span className="text-xs text-muted-foreground">{formatWhen(occurredAt)}</span>
          {hidden ? <Badge variant="outline">Oculto</Badge> : null}
          {privateReplied ? <Badge variant="outline">Direct enviado</Badge> : null}
          {badges}
        </div>
        <p
          className={
            hidden
              ? "mt-1 whitespace-pre-wrap text-sm text-muted-foreground"
              : "mt-1 whitespace-pre-wrap text-sm"
          }
        >
          {body || "Comentário sem texto."}
        </p>

        {canWrite ? (
          <div className="mt-1 flex flex-wrap gap-x-4">
            {!fromBrand ? (
              <>
                {showReplyLink ? (
                  <ActionLink onClick={() => setComposer(composer === "reply" ? null : "reply")}>
                    Responder
                  </ActionLink>
                ) : null}
                {canPrivateReply ? (
                  <ActionLink
                    onClick={() => setComposer(composer === "private" ? null : "private")}
                  >
                    Responder no Direct
                  </ActionLink>
                ) : null}
                <ActionLink onClick={() => void actions.setHidden(signalId, !hidden)}>
                  {hidden ? "Mostrar" : "Ocultar"}
                </ActionLink>
              </>
            ) : null}
            <ActionLink destructive onClick={() => setConfirmDelete(true)}>
              Excluir
            </ActionLink>
          </div>
        ) : null}

        {composer ? (
          <CommentReplyBox
            key={composer}
            signalId={signalId}
            mode={composer === "private" ? "private" : "public"}
            initialText={composer === "reply" ? replyPrefill : ""}
            autoFocus
            onCancel={() => setComposer(null)}
            onReply={composer === "private" ? actions.privateReply : actions.reply}
          />
        ) : null}

        <DeleteConfirm
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          fromBrand={fromBrand}
          onConfirm={() => void actions.remove(signalId)}
        />
      </div>
    </div>
  );
}

function ReplyItem({
  reply,
  brandName,
  canWrite,
  actions,
}: {
  reply: CrmThreadReply;
  brandName: string;
  canWrite: boolean;
  actions: CommentActions;
}) {
  return (
    <li>
      <CommentBody
        signalId={reply.id}
        personName={reply.personName}
        body={reply.body}
        occurredAt={reply.occurredAt}
        hidden={reply.hidden}
        fromBrand={reply.fromBrand}
        brandName={brandName}
        canWrite={canWrite}
        canPrivateReply={false}
        privateReplied={false}
        replyPrefill={reply.personName.startsWith("@") ? `${reply.personName} ` : ""}
        actions={actions}
      />
    </li>
  );
}

function CommentThreadCard({
  thread,
  brandName,
  canWrite,
  actions,
}: {
  thread: CrmCommentFeedThread;
  brandName: string;
  canWrite: boolean;
  actions: CommentActions;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const count = thread.replies.length;
  const place = placeLabel(thread.place);

  return (
    <li className="rounded-lg border border-border p-3 sm:p-4">
      {thread.captionExcerpt || thread.permalink ? (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
          <p className="line-clamp-1 min-w-0 flex-1 text-xs text-muted-foreground">
            {place ? `${place} · ` : null}
            {thread.captionExcerpt || "Publicação"}
          </p>
          {thread.permalink ? (
            <a
              href={thread.permalink}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium underline"
            >
              Ver publicação
            </a>
          ) : null}
        </div>
      ) : null}

      {thread.orphanReply ? (
        <p className="mb-2 text-xs text-muted-foreground">
          Resposta a um comentário que não está no CRM
        </p>
      ) : null}

      <CommentBody
        signalId={thread.id}
        personName={thread.personName}
        body={thread.body}
        occurredAt={thread.occurredAt}
        hidden={thread.hidden}
        fromBrand={false}
        brandName={brandName}
        canWrite={canWrite}
        canPrivateReply={thread.canPrivateReply}
        privateReplied={thread.privateReplied}
        replyPrefill=""
        showReplyLink={thread.answered}
        actions={actions}
        badges={thread.answered ? <Badge variant="secondary">Respondido</Badge> : null}
      />

      {count > 0 ? (
        <div className="ml-11 mt-2">
          <button
            type="button"
            onClick={() => setShowReplies((open) => !open)}
            className="flex min-h-9 items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={showReplies}
          >
            <span aria-hidden className="h-px w-6 bg-border" />
            {showReplies
              ? "Ocultar respostas"
              : `Ver ${count === 1 ? "1 resposta" : `${count} respostas`}`}
            {showReplies ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {showReplies ? (
            <ul className="mt-2 space-y-3 border-l border-border pl-3">
              {thread.replies.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  brandName={brandName}
                  canWrite={canWrite}
                  actions={actions}
                />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {canWrite && !thread.answered ? (
        <div className="ml-11">
          <CommentReplyBox signalId={thread.id} onReply={actions.reply} />
        </div>
      ) : null}
    </li>
  );
}

export function CrmCommentFeed({
  cadastroClienteId,
  days,
  canWrite,
}: {
  cadastroClienteId: number;
  days: PeriodDays;
  canWrite: boolean;
}) {
  const listFn = useServerFn(listCrmCommentsFn);
  const actions = useCommentActions();
  const commentsQuery = useQuery({
    queryKey: crmKeys.comments(cadastroClienteId, days),
    queryFn: () => listFn({ data: { cadastroClienteId, days } }),
  });

  const threads = commentsQuery.data?.threads ?? [];
  const brandName = commentsQuery.data?.brandName ?? "Marca";

  if (commentsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando comentários…</p>;
  }
  if (threads.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        compact
        title="Nenhum comentário neste recorte"
        description="Puxe o Instagram para trazer os comentários das publicações recentes."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {threads.map((thread) => (
        <CommentThreadCard
          key={thread.id}
          thread={thread}
          brandName={brandName}
          canWrite={canWrite}
          actions={actions}
        />
      ))}
    </ul>
  );
}
