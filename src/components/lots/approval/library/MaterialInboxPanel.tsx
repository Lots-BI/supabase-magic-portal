import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, FolderOpen, HardDriveDownload } from "lucide-react";
import { formatBR } from "@/lib/period";
import { formatBytes } from "@/modules/approval/services/material-upload";
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
import type { ContentCard } from "@/modules/approval/types/content-card";
import type { MediaAsset } from "@/lib/media-preview";

type InboxItem = {
  card: ContentCard;
  materials: MediaAsset[];
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
    onSuccess: (card) => {
      toast.success("Mídias baixadas — conteúdo em produção.");
      qc.invalidateQueries({ queryKey: ["approval", "materials", cadastroClienteId] });
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
        title="Nenhum conteúdo no calendário"
        description="Crie conteúdos no calendário editorial — cada um vira um slot nesta biblioteca."
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
                onDownloadAndProduce={() => {
                  for (const m of item.materials) {
                    if (m.downloadUrl) window.open(m.downloadUrl, "_blank", "noopener");
                  }
                  markMut.mutate(item.card.id);
                }}
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
  onDownloadAndProduce,
}: {
  item: InboxItem;
  marking: boolean;
  onDownloadAndProduce: () => void;
}) {
  const { card, materials } = item;
  const statusLabel = KANBAN_COLUMNS.find((c) => c.status === card.status)?.label ?? card.status;
  const ready = card.status === "aguardando_material" && materials.length > 0;

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{card.titulo}</p>
          <p className="text-xs text-muted-foreground">
            {statusLabel} · {card.plataforma}
            {card.formato ? ` · ${card.formato}` : ""} ·{" "}
            {formatCardSchedule(card.data_publicacao, card.hora_publicacao)}
          </p>
        </div>
        {ready ? (
          <Button type="button" size="sm" disabled={marking} onClick={onDownloadAndProduce}>
            <HardDriveDownload className="mr-2 h-4 w-4" />
            Baixar e ir para produção
          </Button>
        ) : null}
      </div>

      {materials.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Aguardando o cliente enviar as mídias gravadas a partir do roteiro.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {materials.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-lg border border-border bg-muted/30">
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
                {m.downloadUrl ? (
                  <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" asChild>
                    <a href={m.downloadUrl} download={m.fileName ?? undefined}>
                      <Download className="mr-1 h-3.5 w-3.5" />
                      Baixar
                    </a>
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
