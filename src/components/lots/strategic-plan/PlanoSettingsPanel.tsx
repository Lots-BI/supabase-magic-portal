import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { archivePlano, deletePlano, updatePlano } from "@/lib/strategic-plan.functions";
import type { PlanoEstrategico } from "@/lib/strategic-plan/types";
import { PLANO_STATUS } from "@/lib/strategic-plan/types";
import { Field, TextArea, TextInput, Select } from "@/components/lots/FormField";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/lots/ConfirmDialog";

interface PlanoSettingsPanelProps {
  plano: PlanoEstrategico;
  isAdmin?: boolean;
  onUpdated: () => void;
  onClose?: () => void;
}

export function PlanoSettingsPanel({
  plano,
  isAdmin,
  onUpdated,
  onClose,
}: PlanoSettingsPanelProps) {
  const navigate = useNavigate();
  const updateFn = useServerFn(updatePlano);
  const archiveFn = useServerFn(archivePlano);
  const deleteFn = useServerFn(deletePlano);

  const [titulo, setTitulo] = useState(plano.titulo);
  const [descricao, setDescricao] = useState(plano.descricao ?? "");
  const [observacoes, setObservacoes] = useState(plano.observacoes ?? "");
  const [status, setStatus] = useState(plano.status);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const saveMut = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          id: plano.id,
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          observacoes: observacoes.trim() || null,
          status,
        },
      }),
    onSuccess: () => {
      toast.success("Plano atualizado");
      onUpdated();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const archiveMut = useMutation({
    mutationFn: () => archiveFn({ data: { id: plano.id } }),
    onSuccess: () => {
      toast.success("Plano arquivado");
      onClose?.();
      void navigate({ to: "/admin/plano-estrategico" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao arquivar"),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { id: plano.id } }),
    onSuccess: () => {
      toast.success("Plano excluído permanentemente");
      onClose?.();
      void navigate({ to: "/admin/plano-estrategico" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  return (
    <div className="space-y-4">
      <Field label="Nome do plano" required>
        <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      </Field>
      <Field label="Descrição">
        <TextArea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
      </Field>
      <Field label="Observações internas">
        <TextArea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
      </Field>
      {isAdmin && (
        <Field label="Status" hint="Arquivar libera um novo plano ativo para o mesmo cliente.">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {PLANO_STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Button
        type="button"
        size="sm"
        disabled={!titulo.trim() || saveMut.isPending}
        onClick={() => saveMut.mutate()}
      >
        Salvar alterações do plano
      </Button>

      {isAdmin && (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Zona de risco
          </p>
          <p className="text-xs text-muted-foreground">
            Use para corrigir planos de teste ou falhas operacionais. Excluir remove objetivos,
            estratégias, roadmap e todo o histórico vinculado.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => setConfirmArchive(true)}
            >
              Arquivar plano
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              Excluir plano permanentemente
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Arquivar este plano?"
        description="O plano deixa de aparecer como ativo. Você poderá criar um novo plano para o mesmo cliente."
        confirmLabel="Arquivar"
        variant="destructive"
        onConfirm={() => archiveMut.mutate()}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir plano permanentemente?"
        description="Esta ação não pode ser desfeita. Todos os objetivos, estratégias, KPIs, roadmap e eventos serão removidos."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  );
}
