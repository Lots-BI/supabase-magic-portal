import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { MATERIAL_ACCEPT } from "@/modules/approval/services/material-upload";
import {
  uploadHint,
  uploadMaterialBytes,
  validateMaterialFile,
  type MaterialUploadTicket,
} from "@/modules/approval/client/direct-media-upload";

type JobStatus = "uploading" | "done" | "error";

type Job = {
  id: string;
  file: File;
  progress: number;
  status: JobStatus;
  error?: string;
  controller: AbortController;
};

export function MaterialUploadQueue({
  label = "Anexar mídias gravadas",
  createTicket,
  confirm,
  onDone,
  variant = "button",
  capture,
  accept = MATERIAL_ACCEPT,
  empty,
}: {
  label?: string;
  createTicket: (file: File) => Promise<MaterialUploadTicket>;
  confirm: (input: {
    path: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }) => Promise<unknown>;
  onDone?: () => void;
  variant?: "button" | "camera";
  capture?: boolean;
  accept?: string;
  empty?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  const busy = jobs.some((j) => j.status === "uploading");

  const patchJob = (id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  };

  const runFile = async (original: File) => {
    const { file, mimeType } = await validateMaterialFile(original);
    const id = `${file.name}-${file.size}-${Date.now()}`;
    const controller = new AbortController();
    setJobs((prev) => [...prev, { id, file, progress: 0, status: "uploading", controller }]);
    try {
      const ticket = await createTicket(file);
      await uploadMaterialBytes({
        ticket: { ...ticket, mimeType: ticket.mimeType || mimeType },
        file,
        signal: controller.signal,
        onProgress: (pct) => patchJob(id, { progress: pct }),
      });
      await confirm({
        path: ticket.path,
        fileName: file.name,
        mimeType: ticket.mimeType || mimeType,
        fileSize: file.size,
      });
      patchJob(id, { status: "done", progress: 100 });
      toast.success(`${file.name} enviado.`);
      onDone?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha no envio";
      patchJob(id, { status: "error", error: message });
      toast.error(message);
    }
  };

  const handleFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    for (const file of Array.from(list)) {
      await runFile(file);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const camera = variant === "camera";

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple={!capture}
        accept={accept}
        capture={capture ? "environment" : undefined}
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {camera ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground",
            empty && !busy && "animate-pulse border-foreground/40",
          )}
        >
          {busy ? <Loader2 className="h-10 w-10 animate-spin" /> : <Camera className="h-10 w-10" />}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {busy ? "Enviando…" : label}
          </Button>
        </div>
      )}
      {jobs.length > 0 && (
        <ul className="space-y-2">
          {jobs.map((job) => (
            <li key={job.id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{job.file.name}</p>
                  <p className="text-[11px] text-muted-foreground">{uploadHint(job.file)}</p>
                </div>
                {job.status === "uploading" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => job.controller.abort()}
                    aria-label="Cancelar envio"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              <Progress className="mt-2" value={job.status === "done" ? 100 : job.progress} />
              <p
                className={cn(
                  "mt-1 text-[11px]",
                  job.status === "error" ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {job.status === "uploading" && `${job.progress}% enviado`}
                {job.status === "done" && "Pronto"}
                {job.status === "error" && job.error}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
