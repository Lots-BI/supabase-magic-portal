import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCard,
  listEditorialPillars,
  uploadCardMedia,
} from "@/modules/approval/cards/cards.server";
import { CardMediaUpload } from "./CardMediaUpload";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CardCreateSheet({
  open,
  onClose,
  cliente,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  cliente: { id: number; nome_cliente: string };
  onCreated: () => void;
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createCard);
  const uploadFn = useServerFn(uploadCardMedia);
  const pillarsFn = useServerFn(listEditorialPillars);

  const [form, setForm] = useState({
    titulo: "",
    data_publicacao: new Date().toISOString().slice(0, 10),
    hora_publicacao: "",
    plataforma: "instagram",
    formato: "",
    responsavel_email: "",
    pilar_id: "" as string,
    legenda: "",
    copy_text: "",
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [createdCardId, setCreatedCardId] = useState<string | null>(null);

  const pillarsQ = useQuery({
    queryKey: ["editorial-pillars", cliente.id],
    queryFn: () => pillarsFn({ data: { cadastro_cliente_id: cliente.id } }),
    enabled: open,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const card = await createFn({
        data: {
          cadastro_cliente_id: cliente.id,
          cliente_nome: cliente.nome_cliente,
          titulo: form.titulo.trim(),
          data_publicacao: form.data_publicacao,
          hora_publicacao: form.hora_publicacao || null,
          plataforma: form.plataforma,
          formato: form.formato || null,
          responsavel_email: form.responsavel_email || null,
          pilar_id: form.pilar_id,
          legenda: form.legenda || null,
          copy_text: form.copy_text || null,
          status: "producao",
          kanban_ordem: 0,
        },
      });
      setCreatedCardId(card.id);
      for (const file of pendingFiles) {
        const base64 = await fileToBase64(file);
        await uploadFn({
          data: {
            cardId: card.id,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            base64,
          },
        });
      }
      return card;
    },
    onSuccess: () => {
      toast.success("Card criado.");
      qc.invalidateQueries({ queryKey: ["approval", "kanban", cliente.id] });
      onCreated();
      onClose();
      setForm({
        titulo: "",
        data_publicacao: new Date().toISOString().slice(0, 10),
        hora_publicacao: "",
        plataforma: "instagram",
        formato: "",
        responsavel_email: "",
        pilar_id: "",
        legenda: "",
        copy_text: "",
      });
      setPendingFiles([]);
      setCreatedCardId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex h-[100dvh] w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Novo conteúdo</SheetTitle>
          <SheetDescription>{cliente.nome_cliente}</SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.titulo.trim()) {
              toast.error("Título obrigatório.");
              return;
            }
            if (!form.pilar_id) {
              toast.error("Selecione um pilar editorial.");
              return;
            }
            if ((pillarsQ.data ?? []).length === 0) {
              toast.error("Cadastre um pilar editorial antes de criar cards.");
              return;
            }
            createMut.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="new-titulo">Título *</Label>
            <Input
              id="new-titulo"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="new-data">Data</Label>
              <Input
                id="new-data"
                type="date"
                value={form.data_publicacao}
                onChange={(e) => setForm((f) => ({ ...f, data_publicacao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-hora">Hora</Label>
              <Input
                id="new-hora"
                type="time"
                value={form.hora_publicacao}
                onChange={(e) => setForm((f) => ({ ...f, hora_publicacao: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select
                value={form.plataforma}
                onValueChange={(v) => setForm((f) => ({ ...f, plataforma: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-formato">Formato</Label>
              <Input
                id="new-formato"
                placeholder="feed, reel…"
                value={form.formato}
                onChange={(e) => setForm((f) => ({ ...f, formato: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Responsável (e-mail)</Label>
            <Input
              type="email"
              value={form.responsavel_email}
              onChange={(e) => setForm((f) => ({ ...f, responsavel_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Pilar *</Label>
            {(pillarsQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum pilar ativo. Cadastre pilares na aba Pilares antes de criar conteúdo.
              </p>
            ) : (
              <Select
                value={form.pilar_id}
                onValueChange={(v) => setForm((f) => ({ ...f, pilar_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Obrigatório" />
                </SelectTrigger>
                <SelectContent>
                  {(pillarsQ.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-copy">Copy</Label>
            <Textarea
              id="new-copy"
              rows={2}
              value={form.copy_text}
              onChange={(e) => setForm((f) => ({ ...f, copy_text: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-legenda">Legenda</Label>
            <Textarea
              id="new-legenda"
              rows={2}
              value={form.legenda}
              onChange={(e) => setForm((f) => ({ ...f, legenda: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Upload (opcional)</Label>
            <Input
              type="file"
              multiple
              accept="image/*,video/*,application/pdf,audio/*"
              onChange={(e) => setPendingFiles(Array.from(e.target.files ?? []))}
            />
            {pendingFiles.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {pendingFiles.length} arquivo(s) serão enviados após criar o card.
              </p>
            )}
          </div>
          {createdCardId && <CardMediaUpload cardId={createdCardId} onUploaded={() => undefined} />}
          <Button type="submit" className="w-full" disabled={createMut.isPending}>
            {createMut.isPending ? "Criando…" : "Criar card"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
