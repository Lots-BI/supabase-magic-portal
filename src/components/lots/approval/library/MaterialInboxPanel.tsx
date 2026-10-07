import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { FolderOpen, HardDriveDownload } from "lucide-react";
import { formatBR } from "@/lib/period";
import {
  listMaterialInboxFn,
  markMaterialsDownloadedFn,
} from "@/modules/approval/cards/cards.server";
import { KANBAN_COLUMNS } from "@/modules/approval/workflow/column-config";
import { formatCardSchedule } from "../kanban/kanban-meta";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";
import { ApprovalEmptyState } from "../shared/ApprovalEmptyState";
import { SectionCard } from "@/components/lots/SectionCard";
import { Button } from "@/components/ui/button";
import { SelectableMediaGallery } from "../card/SelectableMediaGallery";
import type { ContentCard } from "@/modules/approval/types/content-card";
import type { MediaAsset } from "@/lib/media-preview";

type InboxItem = {
  card: ContentCard;
  materials: MediaAsset[];
  baixado?: boolean;
};

export function MaterialInboxPanel({ cadastroClienteId }: { cadastroClienteId: number }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const listFn = useServerFn(listMaterialInboxFn);
  const markFn = useServerFn(markMaterialsDownloadedFn);

  const inboxQ = useQuery({
    queryKey: ["approval", "materials", cadastroClienteId],
    queryFn: async () =>
      (await listFn({ data: { cadastro_cliente_id: cadastroClienteId } })) as InboxItem[],
  });

  const markMut = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: (card: { id: string }) => {
      toast.success("Mídias baixadas — conteúdo em produção.");
      qc.invalidateQueries({ queryKey: ["approval", "materials", cadastroClienteId] });
      qc.invalidateQueries({ queryKey: ["lots-pendencias"] });
      qc.invalidateQueries({ queryKey: ["approval", "kanban", cadastroClienteId] });
      qc.invalidateQueries({ queryKey: ["approval", "calendar", cadastroClienteId] });
      void navigate({
        to: "/admin/aprovacoes/producao/$cardId",
        params: { cardId: card.id },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, InboxItem[]>();
    for (const item of inboxQ.data ?? []) {
      const key = item.card.data_publicacao;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [inboxQ.data]);

  if (inboxQ.isLoading) return <ApprovalPanelSkeleton rows={6} />;

  if (inboxQ.isError) {
    return (
      <p className="text-sm text-destructive">
        Não foi possível carregar as mídias.
        {inboxQ.error instanceof Error ? ` ${inboxQ.error.message}` : ""}
      </p>
    );
  }

  if (!inboxQ.data?.length) {
    return (
      <ApprovalEmptyState
        icon={FolderOpen}
        title="Nenhum material nesta biblioteca"
        description="Quando o calendário tiver conteúdos, os originais do cliente aparecem aqui para download."
      />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Biblioteca de mídias do cliente, organizada pela data do calendário editorial. Baixe os
        originais e avance para produção.
      </p>
      {grouped.map(([day, items]) => (
        <SectionCard key={day} title={formatBR(day)} eyebrow="Calendário">
          <ul className="space-y-4">
            {items.map((item) => (
              <MaterialInboxCard
                key={item.card.id}
                item={item}
                marking={markMut.isPending}
                onStartProduction={() => markMut.mutate(item.card.id)}
              />
            ))}
          </ul>
        </SectionCard>
      ))}
    </div>
  );
}

function MaterialInboxCard({
  item,
  marking,
  onStartProduction,
}: {
  item: InboxItem;
  marking: boolean;
  onStartProduction: () => void;
}) {
  const { card, materials } = item;
  const statusLabel = KANBAN_COLUMNS.find((c) => c.status === card.status)?.label ?? card.status;
  const ready = card.status === "aguardando_material" && materials.length > 0;

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            {card.titulo}
            {item.baixado ? (
              <span className="ml-2 text-[11px] font-medium uppercase tracking-wide text-primary">
                Baixado
              </span>
            ) : materials.length > 0 ? (
              <span className="ml-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Não baixado
              </span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {statusLabel} · {card.plataforma}
            {card.formato ? ` · ${card.formato}` : ""} ·{" "}
            {formatCardSchedule(card.data_publicacao, card.hora_publicacao)}
          </p>
        </div>
        {ready ? (
          <Button type="button" size="sm" disabled={marking} onClick={onStartProduction}>
            <HardDriveDownload className="mr-2 h-4 w-4" />
            Começar peça
          </Button>
        ) : null}
      </div>

      {materials.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Aguardando o cliente enviar as mídias gravadas a partir do roteiro.
        </p>
      ) : (
        <div className="mt-3">
          <SelectableMediaGallery assets={materials} />
        </div>
      )}
    </li>
  );
}
