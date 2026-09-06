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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCard, listEditorialPillars } from "@/modules/approval/cards/cards.server";
import { CONTENT_FORMATOS, FORMAT_LABEL } from "@/modules/approval/types/content-card";
import { LINHAS_EDITORIAIS } from "@/modules/approval/constants/linhas-editoriais";
import { LinhaEditorialSelect } from "@/components/lots/approval/shared/LinhaEditorialSelect";
import {
  BrDateTimeFields,
  isValidTime24h,
} from "@/components/lots/approval/shared/BrDateTimeFields";
import { brtToday } from "@/lib/period";

export function CardCreateSheet({
  open,
  onClose,
  cliente,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  cliente: { id: number; nome_cliente: string };
  onCreated: (cardId?: string) => void;
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createCard);
  const pillarsFn = useServerFn(listEditorialPillars);

  const [titulo, setTitulo] = useState("");
  const [formato, setFormato] = useState<(typeof CONTENT_FORMATOS)[number]>("estatico");
  const [linha, setLinha] = useState<string>(LINHAS_EDITORIAIS[0]);
  const [tema, setTema] = useState("");
  const [data, setData] = useState(brtToday());
  const [hora, setHora] = useState("");
  const [pilarId, setPilarId] = useState<string>("");

  const pillarsQ = useQuery({
    queryKey: ["editorial-pillars", cliente.id],
    queryFn: () => pillarsFn({ data: { cadastro_cliente_id: cliente.id } }),
    enabled: open,
  });

  const createMut = useMutation({
    mutationFn: () => {
      if (hora && !isValidTime24h(hora)) {
        throw new Error("Hora inválida. Use o formato 24h, ex.: 16:00.");
      }
      return createFn({
        data: {
          cadastro_cliente_id: cliente.id,
          cliente_nome: cliente.nome_cliente,
          titulo: titulo.trim(),
          data_publicacao: data,
          hora_publicacao: hora ? `${hora}:00` : null,
          formato,
          linha_editorial: linha,
          tema: tema.trim() || null,
          plataforma: "instagram",
          status: "roteiro",
          pilar_id: pilarId || null,
          kanban_ordem: 0,
        },
      });
    },
    onSuccess: (card: { id: string }) => {
      toast.success("Conteúdo criado.");
      qc.invalidateQueries({ queryKey: ["approval", "kanban", cliente.id] });
      onCreated(card.id);
      onClose();
      setTitulo("");
      setTema("");
      setHora("");
      setPilarId("");
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
            if (!titulo.trim()) {
              toast.error("Título obrigatório.");
              return;
            }
            if (!tema.trim()) {
              toast.error("Tema obrigatório.");
              return;
            }
            createMut.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="new-titulo">Título *</Label>
            <Input
              id="new-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Formato *</Label>
            <Select
              value={formato}
              onValueChange={(v) => setFormato(v as (typeof CONTENT_FORMATOS)[number])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_FORMATOS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {FORMAT_LABEL[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Linha editorial *</Label>
            <LinhaEditorialSelect value={linha} onChange={setLinha} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-tema">Tema *</Label>
            <Input id="new-tema" value={tema} onChange={(e) => setTema(e.target.value)} />
          </div>
          <BrDateTimeFields
            date={data}
            time={hora}
            onDateChange={setData}
            onTimeChange={setHora}
            dateId="new-data"
            timeId="new-hora"
          />
          <div className="space-y-2">
            <Label>Pilar (opcional)</Label>
            {(pillarsQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pilar ativo — pode criar sem pilar.</p>
            ) : (
              <Select
                value={pilarId || "__none__"}
                onValueChange={(v) => setPilarId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem pilar</SelectItem>
                  {(pillarsQ.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={createMut.isPending}>
            {createMut.isPending ? "Criando…" : "Criar e abrir roteiro"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
