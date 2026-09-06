import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import {
  deleteCardMedia,
  listCardMedia,
  createCardMediaUploadUrl,
  confirmCardMediaUpload,
} from "@/modules/approval/cards/cards.server";
import { formatBytes } from "@/modules/approval/services/material-upload";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/lib/media-preview";
import { MaterialUploadQueue } from "./MaterialUploadQueue";

export function CardMediaUpload({
  cardId,
  capaUrl,
  mediaRole,
  onUploaded,
}: {
  cardId: string;
  capaUrl?: string | null;
  mediaRole?: "preview" | "attachment" | "cliente_material" | "final";
  onUploaded?: () => void;
}) {
  const qc = useQueryClient();
  const createUrlFn = useServerFn(createCardMediaUploadUrl);
  const confirmFn = useServerFn(confirmCardMediaUpload);
  const deleteFn = useServerFn(deleteCardMedia);
  const listFn = useServerFn(listCardMedia);

  const mediaQ = useQuery({
    queryKey: ["content-card-media", cardId],
    queryFn: () => listFn({ data: { cardId, capaUrl: capaUrl ?? null } }),
    enabled: !!cardId,
  });

  const media = ((mediaQ.data?.media ?? []) as MediaAsset[]).filter((item) =>
    mediaRole ? item.mediaRole === mediaRole : item.mediaRole !== "cliente_material",
  );

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["content-card-media", cardId] });
    qc.invalidateQueries({ queryKey: ["content-card", cardId] });
    onUploaded?.();
  };

  const deleteMut = useMutation({
    mutationFn: (attachmentId: string) => deleteFn({ data: { cardId, attachmentId } }),
    onSuccess: () => {
      toast.success("Arquivo removido.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <MaterialUploadQueue
        label={mediaRole === "final" ? "Enviar peça final" : "Enviar arquivo"}
        createTicket={(file) =>
          createUrlFn({
            data: {
              cardId,
              fileName: file.name,
              mimeType: file.type || "",
              fileSize: file.size,
              ...(mediaRole ? { mediaRole } : {}),
            },
          })
        }
        confirm={(input) =>
          confirmFn({
            data: {
              cardId,
              ...input,
              ...(mediaRole ? { mediaRole } : {}),
            },
          })
        }
        onDone={refresh}
      />
      {media.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {media.map((m) => (
            <li
              key={m.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-muted/30"
            >
              {m.kind === "video" ? (
                <video src={m.url} className="aspect-square w-full object-cover" muted />
              ) : (
                <img src={m.url} alt="" className="aspect-square w-full object-cover" />
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-background/80 p-1 text-[10px]">
                <span className="truncate">{m.fileName ?? "arquivo"}</span>
                {m.fileSize ? <span>{formatBytes(m.fileSize)}</span> : null}
              </div>
              <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {m.downloadUrl && (
                  <Button type="button" variant="secondary" size="icon" className="h-7 w-7" asChild>
                    <a href={m.downloadUrl} download={m.fileName ?? undefined}>
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => deleteMut.mutate(m.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {mediaQ.isLoading && (
        <p className={cn("text-xs text-muted-foreground")}>Carregando anexos…</p>
      )}
    </div>
  );
}
