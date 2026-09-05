import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FormRow, Select, TextArea, TextInput } from "@/components/lots/FormField";
import { ClientPicker, type ClientPickerOption } from "./ClientPicker";

const PRIORIDADES = ["A", "B", "C", "D"] as const;

export function CreateTaskDialog({
  open,
  onOpenChange,
  clients,
  defaultClienteId,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientPickerOption[];
  defaultClienteId?: number;
  onSubmit: (data: {
    cadastro_cliente_id: number;
    titulo: string;
    descricao?: string | null;
    prioridade?: (typeof PRIORIDADES)[number];
    agenda_date?: string | null;
  }) => void;
  isPending?: boolean;
}) {
  const [clienteId, setClienteId] = useState(defaultClienteId ? String(defaultClienteId) : "");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState<(typeof PRIORIDADES)[number]>("C");
  const [agendaDate, setAgendaDate] = useState("");

  const reset = () => {
    setClienteId(defaultClienteId ? String(defaultClienteId) : "");
    setTitulo("");
    setDescricao("");
    setPrioridade("C");
    setAgendaDate("");
  };

  const handleOpen = (next: boolean) => {
    if (!next) reset();
    else if (defaultClienteId) setClienteId(String(defaultClienteId));
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Nova tarefa</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Aparece nas prioridades operacionais do dia.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <ClientPicker clients={clients} value={clienteId} onChange={setClienteId} required />
          <Field label="Título" required>
            <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
          </Field>
          <Field label="Descrição">
            <TextArea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </Field>
          <FormRow>
            <Field label="Prioridade">
              <Select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as typeof prioridade)}
              >
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Data na agenda">
              <TextInput
                type="date"
                value={agendaDate}
                onChange={(e) => setAgendaDate(e.target.value)}
              />
            </Field>
          </FormRow>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            disabled={!titulo.trim() || !clienteId || isPending}
            onClick={() =>
              onSubmit({
                cadastro_cliente_id: Number(clienteId),
                titulo: titulo.trim(),
                descricao: descricao.trim() || null,
                prioridade,
                agenda_date: agendaDate || null,
              })
            }
          >
            {isPending ? "Salvando…" : "Criar tarefa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
