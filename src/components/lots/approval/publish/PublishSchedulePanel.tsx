import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Archive, CalendarClock, ExternalLink, Zap } from "lucide-react";
import {
  archiveCard,
  getContentCard,
  publishNowFn,
  schedulePublishFn,
} from "@/modules/approval/cards/cards.server";
import { FEATURE_META_CONTENT_PUBLISH } from "@/lib/feature-flags";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";
import { ApprovalConfirmDialog } from "../shared/ApprovalConfirmDialog";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { ContentCard } from "@/modules/approval/types/content-card";
import { adminConteudosCalendarHref } from "@/modules/approval/services/admin-conteudos-href";

type PublishMode = "now" | "schedule";

type CardDetailPayload = { card: ContentCard };

function toDatetimeLocalValue(card: ContentCard): string {
  if (card.scheduled_publish_at) {
    const d = new Date(card.scheduled_publish_at);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const hora = card.hora_publicacao?.slice(0, 5) ?? "12:00";
  return `${card.data_publicacao}T${hora}`;
}

function instagramPostUrl(
  card: ContentCard,
): string | null {
  const permalink = card.integration_metadata?.instagram_permalink;
  if (typeof permalink === "string" && permalink.startsWith("http")) return permalink;
  if (!card.external_post_id) return null;
  if (card.formato === "reels") {
    return `https://www.instagram.com/reel/${card.external_post_id}/`;
  }
  return `https://www.instagram.com/p/${card.external_post_id}/`;
}

export function PublishSchedulePanel({ cardId, backTo }: { cardId: string; backTo: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getContentCard);
  const publishNowServerFn = useServerFn(publishNowFn);
  const scheduleServerFn = useServerFn(schedulePublishFn);
  const archiveFn = useServerFn(archiveCard);

  const [mode, setMode] = useState<PublishMode>("schedule");
  const [scheduledAt, setScheduledAt] = useState("");
  const [scopeError, setScopeError] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const detailQ = useQuery({
    queryKey: ["content-card", cardId],
    queryFn: async () => (await getFn({ data: { id: cardId } })) as CardDetailPayload,
    enabled: !!cardId,
  });

  const card = detailQ.data?.card;

  useEffect(() => {
    if (card) setScheduledAt(toDatetimeLocalValue(card));
  }, [card?.id, card?.scheduled_publish_at, card?.data_publicacao, card?.hora_publicacao]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["content-card", cardId] });

  const handlePublishError = (e: Error) => {
    if (e.message.includes("missing_publish_scope")) {
      setScopeError(true);
    }
    toast.error(e.message);
  };

  const publishNowMut = useMutation({
    mutationFn: () => publishNowServerFn({ data: { card_id: cardId } }),
    onSuccess: () => {
      toast.success("Publicação iniciada.");
      setScopeError(false);
      invalidate();
    },
    onError: handlePublishError,
  });

  const scheduleMut = useMutation({
    mutationFn: () => {
      const iso = new Date(scheduledAt).toISOString();
      return scheduleServerFn({ data: { card_id: cardId, scheduled_at: iso } });
    },
    onSuccess: () => {
      toast.success("Agendado no Lots. O Instagram só recebe o post no horário combinado.");
      setScopeError(false);
      invalidate();
    },
    onError: handlePublishError,
  });

  const archiveMut = useMutation({
    mutationFn: () => archiveFn({ data: { id: cardId } }),
    onSuccess: () => {
      toast.success("Conteúdo arquivado.");
      setArchiveOpen(false);
      void qc.invalidateQueries({ queryKey: ["approval"] });
      const cadastroId = detailQ.data?.card?.cadastro_cliente_id;
      if (cadastroId) {
        void navigate(adminConteudosCalendarHref(cadastroId));
      } else {
        void navigate({ to: backTo });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (mode === "now") {
      publishNowMut.mutate();
    } else {
      if (!scheduledAt) {
        toast.error("Informe data e hora para agendar.");
        return;
      }
      scheduleMut.mutate();
    }
  };

  const isPending = publishNowMut.isPending || scheduleMut.isPending;

  if (detailQ.isLoading) {
    return (
      <div className="space-y-6">
        <ApprovalPanelSkeleton rows={5} />
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
        <p className="text-sm text-destructive">Não foi possível carregar o agendamento.</p>
      </div>
    );
  }

  const backLink = adminConteudosCalendarHref(card.cadastro_cliente_id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conteúdos"
        title={card.titulo}
        description="Agendar ou publicar agora"
        actions={
          <div className="flex flex-wrap gap-2">
            {card.status !== "arquivado" ? (
              <Button type="button" variant="outline" onClick={() => setArchiveOpen(true)}>
                <Archive className="mr-2 h-4 w-4" />
                Arquivar
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link {...backLink}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao calendário
              </Link>
            </Button>
          </div>
        }
      />

      {!FEATURE_META_CONTENT_PUBLISH && (
        <Alert variant="destructive">
          <AlertTitle>Publicação indisponível</AlertTitle>
          <AlertDescription>
            Conecte o Instagram com permissão de publicar em Conexões.
          </AlertDescription>
        </Alert>
      )}

      {scopeError && (
        <Alert variant="destructive">
          <AlertTitle>Permissão necessária</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              A Meta recusou o token: falta a permissão{" "}
              <span className="font-medium">instagram_content_publish</span>. Adicionar o caso de
              uso no App Dashboard não atualiza o token antigo.{" "}
              <span className="font-medium">pages_manage_posts</span> sozinho não publica no
              Instagram.
            </p>
            <p>
              Confirme o caso de uso <span className="font-medium">Instagram Content Publish</span>{" "}
              (Facebook Login — não é <span className="font-medium">instagram_business_content_publish</span>
              ). Depois, em{" "}
              <Link to="/admin/conexoes" className="underline">
                Conexões
              </Link>
              , use <span className="font-medium">Refazer login</span> e aceite criar/publicar
              conteúdo. Só então volte e clique em Publicar agora.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <SectionCard title="Quando publicar">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="publish-mode"
                checked={mode === "now"}
                onChange={() => setMode("now")}
                className="border-border"
              />
              <span className="text-sm font-medium">Publicar agora</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="publish-mode"
                checked={mode === "schedule"}
                onChange={() => setMode("schedule")}
                className="border-border"
              />
              <span className="text-sm font-medium">Agendar</span>
            </label>
          </div>

          {mode === "schedule" && (
            <div className="space-y-2">
              <Label htmlFor="scheduled-at">Data e hora</Label>
              <Input
                id="scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          )}

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!FEATURE_META_CONTENT_PUBLISH || isPending}
          >
            {mode === "now" ? (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Publicar agora
              </>
            ) : (
              <>
                <CalendarClock className="mr-2 h-4 w-4" />
                Agendar publicação
              </>
            )}
          </Button>
        </div>
      </SectionCard>

      {card.status === "aguardando_aprovacao_final" ? (
        <Alert>
          <AlertTitle>Aguardando o cliente aprovar</AlertTitle>
          <AlertDescription>
            A peça já foi enviada com a data e hora da criação. Quando o cliente clicar em
            Aprovar, o sistema agenda internamente e publica no Instagram nesse horário.
          </AlertDescription>
        </Alert>
      ) : null}

      <SectionCard title="Confirmação da publicação">
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Status:</dt>
            <dd className="font-medium">
              {card.publish_status === "published"
                ? "Publicado no Instagram"
                : card.publish_status === "failed"
                  ? "Falha na publicação"
                  : card.publish_status === "scheduled"
                    ? "Agendado — publica no horário combinado"
                    : card.publish_status === "publishing" || card.publish_status === "queued"
                      ? "Confirmando publicação…"
                      : card.publish_status}
            </dd>
          </div>
          {card.publish_error && (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Erro:</dt>
              <dd className={cn("text-destructive")}>{card.publish_error}</dd>
            </div>
          )}
          {instagramPostUrl(card) && (
            <div className="flex flex-wrap items-center gap-2">
              <dt className="text-muted-foreground">Post:</dt>
              <dd>
                <a
                  href={instagramPostUrl(card) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Ver no Instagram
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </dd>
            </div>
          )}
        </dl>
      </SectionCard>

      <ApprovalConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Arquivar conteúdo?"
        description="O card sai do Kanban e da fila de publicação. Você encontra na Biblioteca, como arquivado."
        confirmLabel="Arquivar"
        onConfirm={() => archiveMut.mutate()}
        loading={archiveMut.isPending}
      />
    </div>
  );
}
