import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, FolderOpen, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  CLIENT_MATERIAL_MAX_FILES,
  MATERIAL_ACCEPT,
  formatBytes,
} from "@/modules/approval/services/material-upload";
import {
  uploadHint,
  uploadMaterialBytes,
  validateMaterialFile,
  type MaterialUploadTicket,
} from "@/modules/approval/client/direct-media-upload";
import type { MediaAsset } from "@/lib/media-preview";

type Staged = {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return coarse;
}

export function ClientMaterialSendPanel({
  existing,
  disabled,
  accept = MATERIAL_ACCEPT,
  createTicket,
  confirm,
  onSent,
  onCanSendChange,
  bindSubmit,
}: {
  existing: MediaAsset[];
  disabled?: boolean;
  accept?: string;
  createTicket: (file: File) => Promise<MaterialUploadTicket>;
  confirm: (input: {
    path: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }) => Promise<unknown>;
  onSent?: () => void;
  onCanSendChange?: (canSend: boolean) => void;
  bindSubmit?: (submit: () => void) => void;
}) {
  const filesRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const coarse = useCoarsePointer();
  const [staged, setStaged] = useState<Staged[]>([]);
  const sending = staged.some((item) => item.status === "uploading");
  const queued = staged.filter((item) => item.status === "queued");
  const room = Math.max(0, CLIENT_MATERIAL_MAX_FILES - existing.length - staged.length);

  const canSend = queued.length > 0 && !sending && !disabled;

  useEffect(() => {
    onCanSendChange?.(canSend);
  }, [canSend, onCanSendChange]);

  function patch(id: string, next: Partial<Staged>) {
    setStaged((prev) => prev.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }

  function addFiles(list: FileList | File[] | null) {
    if (disabled) {
      toast.info("Pré-visualização — ações não são registradas.");
      return;
    }
    const incoming = [...(list ?? [])];
    if (incoming.length === 0) return;
    const take = incoming.slice(0, room);
    if (take.length < incoming.length) {
      toast.error(`Dá para enviar no máximo ${CLIENT_MATERIAL_MAX_FILES} arquivos neste conteúdo.`);
    }
    const added: Staged[] = take.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: "queued",
    }));
    setStaged((prev) => [...prev, ...added]);
  }

  function removeStaged(id: string) {
    setStaged((prev) => {
      const found = prev.find((item) => item.id === id);
      if (found) URL.revokeObjectURL(found.preview);
      return prev.filter((item) => item.id !== id);
    });
  }

  async function submit() {
    if (disabled) {
      toast.info("Pré-visualização — ações não são registradas.");
      return;
    }
    const batch = staged.filter((item) => item.status === "queued" || item.status === "error");
    if (batch.length === 0) {
      toast.error("Escolha as mídias antes de enviar.");
      return;
    }
    let ok = 0;
    for (const item of batch) {
      patch(item.id, { status: "uploading", progress: 0, error: undefined });
      try {
        const { file, mimeType } = await validateMaterialFile(item.file);
        const ticket = await createTicket(file);
        await uploadMaterialBytes({
          ticket: { ...ticket, mimeType: ticket.mimeType || mimeType },
          file,
          onProgress: (pct) => patch(item.id, { progress: pct }),
        });
        await confirm({
          path: ticket.path,
          fileName: file.name,
          mimeType: ticket.mimeType || mimeType,
          fileSize: file.size,
        });
        patch(item.id, { status: "done", progress: 100 });
        ok += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha no envio";
        patch(item.id, { status: "error", error: message });
        toast.error(message);
      }
    }
    if (ok > 0) {
      toast.success(ok === 1 ? "Mídia enviada." : `${ok} mídias enviadas.`);
      setStaged((prev) => {
        for (const item of prev) {
          if (item.status === "done") URL.revokeObjectURL(item.preview);
        }
        return prev.filter((item) => item.status !== "done");
      });
      onSent?.();
    }
  }

  useEffect(() => {
    bindSubmit?.(() => void submit());
  });

  useEffect(
    () => () => {
      for (const item of staged) URL.revokeObjectURL(item.preview);
    },
    // só no unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="space-y-4">
      <input
        ref={filesRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept={accept}
        capture="environment"
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <p className="text-sm font-semibold">Roteiro aprovado. Agora envie as mídias gravadas.</p>
      <p className="text-sm text-muted-foreground">
        Até {CLIENT_MATERIAL_MAX_FILES} arquivos. Elas só entram no conteúdo depois de{" "}
        <strong>Enviar mídias</strong>.
      </p>

      <button
        type="button"
        disabled={sending || room === 0}
        onClick={() => {
          if (disabled) {
            toast.info("Pré-visualização — ações não são registradas.");
            return;
          }
          filesRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex min-h-[140px] w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground",
          staged.length === 0 && existing.length === 0 && "border-foreground/40",
        )}
      >
        <FolderOpen className="h-10 w-10" />
        <span className="text-sm font-medium text-foreground">Escolher arquivos</span>
        <span className="text-xs">Abre o gerenciador · até {room} agora</span>
      </button>

      {coarse ? (
        <Button
          type="button"
          variant="outline"
          disabled={sending || room === 0}
          onClick={() => {
            if (disabled) {
              toast.info("Pré-visualização — ações não são registradas.");
              return;
            }
            cameraRef.current?.click();
          }}
        >
          <Camera className="mr-2 h-4 w-4" />
          Câmera
        </Button>
      ) : null}

      {existing.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {existing.map((asset) => (
            <li key={asset.id} className="overflow-hidden rounded-xl border border-border">
              {asset.kind === "video" ? (
                <video src={asset.url} className="aspect-square w-full object-cover" />
              ) : (
                <img src={asset.url} alt="" className="aspect-square w-full object-cover" />
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {staged.length > 0 ? (
        <ul className="space-y-2">
          {staged.map((item) => (
            <li key={item.id} className="flex gap-3 rounded-xl border border-border bg-card p-2">
              {item.file.type.startsWith("video/") ? (
                <video src={item.preview} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              ) : (
                <img
                  src={item.preview}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {uploadHint(item.file)} · {formatBytes(item.file.size)}
                </p>
                {item.status === "uploading" ? (
                  <Progress className="mt-1" value={item.progress} />
                ) : null}
                {item.status === "error" ? (
                  <p className="text-[11px] text-destructive">{item.error}</p>
                ) : null}
              </div>
              {item.status !== "uploading" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeStaged(item.id)}
                  aria-label="Remover"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
