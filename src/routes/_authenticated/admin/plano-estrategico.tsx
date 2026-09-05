import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { listPlanos, createPlano, deletePlano, updatePlano } from "@/lib/strategic-plan.functions";
import { listClientes } from "@/lib/admin.functions";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { Button } from "@/components/ui/button";
import { Field, TextInput, Select } from "@/components/lots/FormField";
import { ConfirmDialog } from "@/components/lots/ConfirmDialog";
import { PublishAlinhamentoPanel } from "@/components/lots/strategic-plan/PublishAlinhamentoPanel";
import { adminTitle } from "@/lib/brand";
import { slugify } from "@/lib/slug";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/plano-estrategico")({
  head: () => ({ meta: [{ title: adminTitle("Plano Estratégico") }] }),
  component: AdminPlanoPage,
});

type PlanoRow = { id: string; titulo: string; cliente_nome: string; cadastro_cliente_id: number };

function AdminPlanoPage() {
  const listFn = useServerFn(listPlanos);
  const createFn = useServerFn(createPlano);
  const deleteFn = useServerFn(deletePlano);
  const updateFn = useServerFn(updatePlano);

  const { data: planos, refetch } = useQuery({
    queryKey: ["strategic-plan", "admin"],
    queryFn: () => listFn({ data: { status: "ativo" } }),
  });
  const { data: clientes } = useQuery({
    queryKey: ["admin", "clientes-list"],
    queryFn: () => listClientes(),
  });

  const [showForm, setShowForm] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [editingPlano, setEditingPlano] = useState<PlanoRow | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [publishClienteId, setPublishClienteId] = useState("");

  const clientesSemPlano = (clientes ?? []).filter(
    (c: { id: number; nome_cliente: string }) =>
      !(planos ?? []).some((p: PlanoRow) => p.cadastro_cliente_id === c.id),
  );

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Plano excluído");
      setPendingDeleteId(null);
      void refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  const updateMut = useMutation({
    mutationFn: (p: { id: string; titulo: string }) =>
      updateFn({ data: { id: p.id, titulo: p.titulo } }),
    onSuccess: () => {
      toast.success("Plano atualizado");
      setEditingPlano(null);
      void refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const handleCreate = async () => {
    if (!clienteId) return;
    try {
      await createFn({
        data: {
          cadastro_cliente_id: Number(clienteId),
          titulo: titulo.trim() || undefined,
        },
      });
      toast.success("Plano Estratégico criado");
      setShowForm(false);
      setTitulo("");
      setClienteId("");
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar plano");
    }
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Centro Estratégico"
        title="Planos Estratégicos"
        description="Um plano contínuo por cliente. Edite ou exclua planos de teste quando necessário."
        actions={
          clientesSemPlano.length > 0 ? (
            <Button size="sm" className="gap-1.5" onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-3.5 w-3.5" />
              Criar plano
            </Button>
          ) : undefined
        }
      />

      {showForm && (
        <SectionCard title="Criar Plano Estratégico" className="max-w-lg">
          <div className="space-y-3">
            <Field
              label="Cliente"
              required
              hint="Cada cliente pode ter apenas um Plano Estratégico ativo."
            >
              <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Selecione o cliente</option>
                {clientesSemPlano.map((c: { id: number; nome_cliente: string }) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_cliente}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nome do plano (opcional)">
              <TextInput
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Plano Estratégico · Nome do cliente"
              />
            </Field>
            <Button size="sm" onClick={handleCreate} disabled={!clienteId}>
              Criar
            </Button>
          </div>
        </SectionCard>
      )}

      {editingPlano && (
        <SectionCard title="Renomear plano" className="max-w-lg">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{editingPlano.cliente_nome}</p>
            <Field label="Nome do plano" required>
              <TextInput value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!editTitulo.trim() || updateMut.isPending}
                onClick={() => updateMut.mutate({ id: editingPlano.id, titulo: editTitulo.trim() })}
              >
                Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingPlano(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Publicar proposta comercial (aba inteligente)">
        <div className="mb-4 max-w-md space-y-3">
          <Field
            label="Cliente com alinhamento enviado"
            hint="Após o quiz, publique a proposta para liberar o Estado 3 no portal do cliente."
          >
            <Select value={publishClienteId} onChange={(e) => setPublishClienteId(e.target.value)}>
              <option value="">Selecione o cliente</option>
              {(clientes ?? []).map((c: { id: number; nome_cliente: string }) => (
                <option key={c.id} value={c.id}>
                  {c.nome_cliente}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {publishClienteId && (
          <PublishAlinhamentoPanel
            cadastroClienteId={Number(publishClienteId)}
            clienteNome={
              (clientes ?? []).find(
                (c: { id: number; nome_cliente: string }) => c.id === Number(publishClienteId),
              )?.nome_cliente ?? "Cliente"
            }
          />
        )}
      </SectionCard>

      <SectionCard title="Clientes com plano ativo">
        <div className="space-y-2">
          {(planos ?? []).map((p: PlanoRow) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{p.titulo}</p>
                <p className="text-xs text-muted-foreground">{p.cliente_nome}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Renomear ${p.titulo}`}
                  onClick={() => {
                    setEditingPlano(p);
                    setEditTitulo(p.titulo);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  aria-label={`Excluir ${p.titulo}`}
                  onClick={() => setPendingDeleteId(p.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link
                    to="/cliente/$cliente/plano-estrategico/$planoId"
                    params={{ cliente: slugify(p.cliente_nome), planoId: p.id }}
                    aria-label={`Abrir ${p.titulo}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
          {(planos ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum plano ativo. Crie o primeiro plano para um cliente.
            </p>
          )}
        </div>
      </SectionCard>

      <ConfirmDialog
        open={!!pendingDeleteId}
        onOpenChange={(o) => !o && setPendingDeleteId(null)}
        title="Excluir plano permanentemente?"
        description="Todos os objetivos, estratégias, KPIs e histórico vinculados serão removidos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={() => pendingDeleteId && deleteMut.mutate(pendingDeleteId)}
      />
    </div>
  );
}
