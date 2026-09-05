import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/lotus/PageHeader";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/lotus/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteClienteDiretrizes,
  getDiretrizesSignedUrl,
  listClienteDiretrizes,
  saveClienteDiretrizes,
  type ClienteDiretrizesRow,
} from "@/lib/diretrizes.functions";
import {
  DIRETRIZES_BUCKET,
  assertPdfUpload,
  diretrizesStoragePath,
  formatFileSize,
} from "@/lib/diretrizes";
import { DiretrizesPdfViewer } from "./DiretrizesPdfViewer";

export function AdminDiretrizesPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listClienteDiretrizes);
  const saveFn = useServerFn(saveClienteDiretrizes);
  const deleteFn = useServerFn(deleteClienteDiretrizes);
  const signedFn = useServerFn(getDiretrizesSignedUrl);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "diretrizes"],
    queryFn: () => listFn(),
  });

  const [search, setSearch] = useState("");
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ClienteDiretrizesRow | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetIdRef = useRef<number | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        row.nome.toLowerCase().includes(needle) || (row.slug ?? "").toLowerCase().includes(needle),
    );
  }, [rows, search]);

  const published = rows.filter((row) => row.diretrizes).length;

  const { data: preview } = useQuery({
    queryKey: ["admin", "diretrizes", "preview", previewId],
    enabled: previewId != null,
    queryFn: () => signedFn({ data: { cadastroClienteId: previewId! } }),
  });

  const deleteMut = useMutation({
    mutationFn: (cadastroClienteId: number) => deleteFn({ data: { cadastroClienteId } }),
    onSuccess: async () => {
      toast.success("PDF removido");
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "diretrizes"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Falha ao remover"),
  });

  const pickFile = (cadastroClienteId: number) => {
    targetIdRef.current = cadastroClienteId;
    fileInputRef.current?.click();
  };

  const onFile = async (file: File | undefined) => {
    const cadastroClienteId = targetIdRef.current;
    targetIdRef.current = null;
    if (!file || cadastroClienteId == null) return;

    try {
      assertPdfUpload(file);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Arquivo inválido");
      return;
    }

    setUploadingId(cadastroClienteId);
    const path = diretrizesStoragePath(cadastroClienteId, crypto.randomUUID());

    try {
      const { error: uploadError } = await supabase.storage
        .from(DIRETRIZES_BUCKET)
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) throw uploadError;

      await saveFn({
        data: {
          cadastroClienteId,
          storagePath: path,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || "application/pdf",
        },
      });

      toast.success("Diretrizes publicadas");
      await queryClient.invalidateQueries({ queryKey: ["admin", "diretrizes"] });
    } catch (error) {
      await supabase.storage.from(DIRETRIZES_BUCKET).remove([path]);
      toast.error(error instanceof Error ? error.message : "Falha no upload");
    } finally {
      setUploadingId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operações"
        title="Diretrizes da Marca"
        description="Envie o PDF de diretrizes de cada cliente. No portal, o documento abre como a própria página."
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />

      <div className="lotus-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente"
              className="lotus-focus h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm"
            />
          </div>
          <p className="text-[12px] text-muted-foreground">
            {published} de {rows.length} com PDF
          </p>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando clientes…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Nenhum cliente encontrado.</div>
        ) : (
          <ul className="divide-y divide-border/70">
            {filtered.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-foreground">{row.nome}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {row.diretrizes
                      ? `${row.diretrizes.fileName} · ${formatFileSize(row.diretrizes.fileSize)} · ${formatUploadedAt(row.diretrizes.uploadedAt)}`
                      : "Sem PDF publicado"}
                    {!row.ativo ? " · inativo" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {row.diretrizes ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewId(row.id)}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Ver
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingId === row.id}
                    onClick={() => pickFile(row.id)}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingId === row.id
                      ? "Enviando…"
                      : row.diretrizes
                        ? "Substituir PDF"
                        : "Enviar PDF"}
                  </Button>
                  {row.diretrizes ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setPendingDelete(row)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Remover diretrizes?"
        description={
          pendingDelete
            ? `O PDF de ${pendingDelete.nome} deixa de aparecer no portal do cliente.`
            : undefined
        }
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={() => {
          if (pendingDelete) void deleteMut.mutateAsync(pendingDelete.id);
        }}
      />

      <Dialog open={previewId != null} onOpenChange={(open) => !open && setPreviewId(null)}>
        <DialogContent className="flex h-[90dvh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle className="text-[15px]">Pré-visualização</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1">
            {preview?.url ? (
              <DiretrizesPdfViewer
                url={preview.url}
                title={preview.fileName}
                className="block h-full min-h-[70dvh] w-full border-0 bg-neutral-200"
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                Carregando PDF…
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatUploadedAt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
