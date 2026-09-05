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

const ORIGENS = [
  { value: "indicacao", label: "Indicação" },
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
  { value: "site", label: "Site" },
  { value: "evento", label: "Evento" },
  { value: "parceiro", label: "Parceiro" },
  { value: "outro", label: "Outro" },
] as const;

export function CreateLeadDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    nome: string;
    empresa?: string | null;
    origem?: (typeof ORIGENS)[number]["value"];
    valor_estimado?: number | null;
    proxima_acao?: string | null;
    notas?: string | null;
  }) => void;
  isPending?: boolean;
}) {
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [origem, setOrigem] = useState<(typeof ORIGENS)[number]["value"]>("outro");
  const [valor, setValor] = useState("");
  const [proximaAcao, setProximaAcao] = useState("");
  const [notas, setNotas] = useState("");

  const reset = () => {
    setNome("");
    setEmpresa("");
    setOrigem("outro");
    setValor("");
    setProximaAcao("");
    setNotas("");
  };

  const handleOpen = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Novo lead</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Adiciona ao pipeline comercial na coluna Lead.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <FormRow>
            <Field label="Nome do contato" required>
              <TextInput value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
            </Field>
            <Field label="Empresa">
              <TextInput value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Origem">
              <Select value={origem} onChange={(e) => setOrigem(e.target.value as typeof origem)}>
                {ORIGENS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Valor estimado (R$)">
              <TextInput
                type="number"
                min={0}
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </Field>
          </FormRow>
          <Field label="Próxima ação">
            <TextInput value={proximaAcao} onChange={(e) => setProximaAcao(e.target.value)} />
          </Field>
          <Field label="Notas">
            <TextArea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            disabled={!nome.trim() || isPending}
            onClick={() =>
              onSubmit({
                nome: nome.trim(),
                empresa: empresa.trim() || null,
                origem,
                valor_estimado: valor ? Number(valor) : null,
                proxima_acao: proximaAcao.trim() || null,
                notas: notas.trim() || null,
              })
            }
          >
            {isPending ? "Salvando…" : "Criar lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
