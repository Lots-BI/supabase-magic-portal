import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { createCard } from "@/modules/approval/cards/cards.server";
import { CONTENT_FORMATOS, FORMAT_LABEL } from "@/modules/approval/types/content-card";
import { LINHAS_EDITORIAIS } from "@/modules/approval/constants/linhas-editoriais";
import { LinhaEditorialSelect } from "@/components/lots/approval/shared/LinhaEditorialSelect";
import {
  BrDateTimeFields,
  isValidTime24h,
} from "@/components/lots/approval/shared/BrDateTimeFields";
import { formatBR } from "@/lib/period";

/**
 * Criação pelo calendário editorial.
 * Fluxo: create (status `roteiro`) → navega para editor → staff envia para aprovação.
 */
export function CalendarCreateSheet({
  open,
  onClose,
  cadastroClienteId,
  clienteNome,
  defaultDate,
  suggestedTime,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  cadastroClienteId: number;
  clienteNome: string;
  defaultDate: string;
  suggestedTime?: string | null;
  onCreated: (cardId: string) => void;
}) {
  const createFn = useServerFn(createCard);
  const [titulo, setTitulo] = useState("");
  const [formato, setFormato] = useState<(typeof CONTENT_FORMATOS)[number]>("estatico");
  const [linha, setLinha] = useState<string>(LINHAS_EDITORIAIS[0] ?? "Institucional");
  const [tema, setTema] = useState("");
  const [data, setData] = useState(defaultDate);
  const [hora, setHora] = useState("16:00");

  useEffect(() => {
    if (!open) return;
    setData(defaultDate);
    setTitulo("");
    setFormato("estatico");
    setLinha(LINHAS_EDITORIAIS[0] ?? "Institucional");
    setTema("");
    setHora(suggestedTime?.slice(0, 5) || "16:00");
  }, [open, defaultDate, suggestedTime]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!isValidTime24h(hora)) {
        throw new Error("Hora inválida. Use o formato 24h, ex.: 16:00.");
      }
      return createFn({
        data: {
          cadastro_cliente_id: cadastroClienteId,
          cliente_nome: clienteNome,
          titulo: titulo.trim(),
          data_publicacao: data,
          hora_publicacao: `${hora}:00`,
          formato,
          linha_editorial: linha,
          tema: tema.trim(),
          plataforma: "instagram",
          status: "roteiro",
          pilar_id: null,
          kanban_ordem: 0,
        },
      });
    },
    onSuccess: (card: { id: string }) => {
      toast.success(`Conteúdo criado para ${formatBR(data)} às ${hora}. Abrindo o roteiro…`);
      onCreated(card.id);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit =
    !!titulo.trim() && !!tema.trim() && !!data && !!linha && isValidTime24h(hora) && !mut.isPending;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Criar conteúdo</SheetTitle>
          <SheetDescription>
            Planeje o dia no calendário. Em seguida você escreve o roteiro e só então envia ao
            cliente.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Reels bastidores do evento"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Formato</Label>
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
            <Label>Linha editorial</Label>
            <LinhaEditorialSelect value={linha} onChange={setLinha} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tema">Tema</Label>
            <Input
              id="tema"
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Assunto principal do conteúdo"
            />
          </div>
          <BrDateTimeFields
            date={data}
            time={hora}
            onDateChange={setData}
            onTimeChange={setHora}
            dateId="data"
            timeId="hora"
            requiredDate
          />
          <Button className="w-full" disabled={!canSubmit} onClick={() => mut.mutate()}>
            {mut.isPending ? "Criando…" : "Criar e abrir roteiro"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
