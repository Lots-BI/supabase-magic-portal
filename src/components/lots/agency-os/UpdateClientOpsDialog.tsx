import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FormRow, Select, TextInput } from "@/components/lots/FormField";
import type { AgencyClientCard } from "@/modules/agency-os";

const STATUS = [
  { value: "ativo", label: "Ativo" },
  { value: "implantacao", label: "Implantação" },
  { value: "negociacao", label: "Negociação" },
  { value: "pausado", label: "Pausado" },
  { value: "atencao", label: "Atenção" },
] as const;

const PRIORIDADES = ["A", "B", "C", "D"] as const;

export function UpdateClientOpsDialog({
  client,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  client: AgencyClientCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    id: number;
    proxima_acao?: string | null;
    status_operacional?: AgencyClientCard["status_operacional"];
    prioridade?: AgencyClientCard["prioridade"];
  }) => void;
  isPending?: boolean;
}) {
  const [proximaAcao, setProximaAcao] = useState("");
  const [status, setStatus] = useState<AgencyClientCard["status_operacional"]>("ativo");
  const [prioridade, setPrioridade] = useState<AgencyClientCard["prioridade"]>("C");

  useEffect(() => {
    if (client) {
      setProximaAcao(client.proxima_acao ?? "");
      setStatus(client.status_operacional);
      setPrioridade(client.prioridade);
    }
  }, [client]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Operação do cliente</DialogTitle>
          {client && <p className="text-sm text-muted-foreground">{client.nome_cliente}</p>}
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Próxima ação">
            <TextInput value={proximaAcao} onChange={(e) => setProximaAcao(e.target.value)} />
          </Field>
          <FormRow>
            <Field label="Status operacional">
              <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                {STATUS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
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
          </FormRow>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            disabled={!client || isPending}
            onClick={() => {
              if (!client) return;
              onSubmit({
                id: client.id,
                proxima_acao: proximaAcao.trim() || null,
                status_operacional: status,
                prioridade,
              });
            }}
          >
            {isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
