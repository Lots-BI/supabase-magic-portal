import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FormRow, Select, TextInput } from "@/components/lots/FormField";
import { ClientPicker, type ClientPickerOption } from "./ClientPicker";
import type { AgencyClientCard } from "@/modules/agency-os";

const TIPOS = [
  { value: "landing", label: "Landing page" },
  { value: "site", label: "Site" },
  { value: "sistema", label: "Sistema" },
  { value: "automacao", label: "Automação" },
  { value: "seo", label: "SEO" },
  { value: "design", label: "Design" },
  { value: "outro", label: "Outro" },
] as const;

const PRIORIDADES = ["A", "B", "C", "D"] as const;

export function CreateProjectDialog({
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
    tipo?: (typeof TIPOS)[number]["value"];
    prioridade?: (typeof PRIORIDADES)[number];
    etiqueta?: string | null;
    prazo?: string | null;
  }) => void;
  isPending?: boolean;
}) {
  const [clienteId, setClienteId] = useState(defaultClienteId ? String(defaultClienteId) : "");
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["value"]>("outro");
  const [prioridade, setPrioridade] = useState<(typeof PRIORIDADES)[number]>("C");
  const [etiqueta, setEtiqueta] = useState("");
  const [prazo, setPrazo] = useState("");

  const reset = () => {
    setClienteId(defaultClienteId ? String(defaultClienteId) : "");
    setTitulo("");
    setTipo("outro");
    setPrioridade("C");
    setEtiqueta("");
    setPrazo("");
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
          <DialogTitle className="font-display">Novo projeto</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Entra no kanban de Produção na coluna Em Produção.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <ClientPicker clients={clients} value={clienteId} onChange={setClienteId} required />
          <Field label="Título" required>
            <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
          </Field>
          <FormRow cols={3}>
            <Field label="Tipo">
              <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
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
            <Field label="Prazo">
              <TextInput type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </Field>
          </FormRow>
          <Field label="Etiqueta / fase">
            <TextInput
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              placeholder="Ex.: Sprint 1, Revisão copy…"
            />
          </Field>
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
                tipo,
                prioridade,
                etiqueta: etiqueta.trim() || null,
                prazo: prazo || null,
              })
            }
          >
            {isPending ? "Salvando…" : "Criar projeto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
