import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, Trash2, Loader2 } from "lucide-react";
import {
  deleteCardMedia,
  listCardMedia,
  uploadCardMedia,
} from "@/modules/approval/cards/cards.server";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/lib/media-preview";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ACCEPT = "image/*,video/*,application/pdf,audio/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";

export function CardMediaUpload({
  cardId,
  capaUrl,
  onUploaded,
}: {
  cardId: string;
  capaUrl?: string | null;
  onUploaded?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const uploadFn = useServerFn(uploadCardMedia);
  const deleteFn = useServerFn(deleteCardMedia);
  const listFn = useServerFn(listCardMedia);
  const [uploading, setUploading] = useState(false);

  const mediaQ = useQuery({
    queryKey: ["content-card-media", cardId],
    queryFn: () => listFn({ data: { cardId, capaUrl: capaUrl ?? null } }),
    enabled: !!cardId,
  });

  const media = (mediaQ.data?.media ?? []) as MediaAsset[];

  const deleteMut = useMutation({
    mutationFn: (attachmentId: string) => deleteFn({ data: { cardId, attachmentId } }),
    onSuccess: () => {
      toast.success("Arquivo removido.");
      qc.invalidateQueries({ queryKey: ["content-card-media", cardId] });
      qc.invalidateQueries({ queryKey: ["content-card", cardId] });
      onUploaded?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const base64 = await fileToBase64(file);
        await uploadFn({
          data: {
            cardId,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            base64,
          },
        });
      }
      toast.success(files.length > 1 ? `${files.length} arquivos enviados.` : "Arquivo enviado.");
      qc.invalidateQueries({ queryKey: ["content-card-media", cardId] });
      qc.invalidateQueries({ queryKey: ["content-card", cardId] });
      onUploaded?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Enviar arquivo
        </Button>
      </div>
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
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => deleteMut.mutate(m.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
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
