import { createFileRoute } from "@tanstack/react-router";
import { adminTitle } from "@/lib/brand";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listServicos, upsertServico } from "@/lib/admin.functions";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { EmptyState } from "@/components/lots/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const servicosQuery = { queryKey: ["admin", "servicos"], queryFn: () => listServicos() };

export const Route = createFileRoute("/_authenticated/admin/servicos")({
  head: () => ({ meta: [{ title: adminTitle("Serviços") }] }),
  loader: ({ context }) =>
    (
      context as { queryClient: { ensureQueryData: (q: typeof servicosQuery) => unknown } }
    ).queryClient.ensureQueryData(servicosQuery),
  component: ServicosAdmin,
  errorComponent: ({ error }) => <p className="text-sm text-destructive">Erro: {error.message}</p>,
});

type Servico = {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
};

function ServicosAdmin() {
  const { data } = useSuspenseQuery(servicosQuery);
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const servicos = (data ?? []) as Servico[];

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const promise = upsertServico({ data: { nome, descricao, ativo: true } }).then(async () => {
      setNome("");
      setDescricao("");
      await qc.invalidateQueries({ queryKey: ["admin", "servicos"] });
    });
    toast.promise(promise, {
      loading: "Criando serviço…",
      success: "Serviço adicionado.",
      error: (err) => (err instanceof Error ? err.message : "Erro ao criar"),
    });
  };

  const toggle = (s: Servico) => {
    const promise = upsertServico({
      data: { id: s.id, nome: s.nome, descricao: s.descricao, ativo: !s.ativo },
    }).then(() => qc.invalidateQueries({ queryKey: ["admin", "servicos"] }));
    toast.promise(promise, {
      loading: s.ativo ? "Desativando…" : "Reativando…",
      success: s.ativo ? "Serviço desativado." : "Serviço reativado.",
      error: (err) => (err instanceof Error ? err.message : "Erro"),
    });
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Operações"
        title="Serviços"
        description="Catálogo de serviços oferecidos aos clientes — ative, desative ou cadastre novos."
      />

      <SectionCard eyebrow="Novo" title="Adicionar serviço">
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <Label htmlFor="svc-nome">Nome</Label>
            <Input
              id="svc-nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="min-w-0 flex-[2]">
            <Label htmlFor="svc-desc">Descrição</Label>
            <Input
              id="svc-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button type="submit">Adicionar</Button>
        </form>
      </SectionCard>

      <SectionCard
        eyebrow="Catálogo"
        title={`${servicos.length} ${servicos.length === 1 ? "serviço" : "serviços"}`}
        bodyClassName="px-0 py-0"
      >
        {servicos.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Nenhum serviço cadastrado"
            description="Adicione o primeiro serviço no formulário acima."
            compact
          />
        ) : (
          <div className="lots-table-scroll">
            <table className="w-full min-w-max text-sm">
              <thead className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="lots-table-head-sticky px-4 py-2.5 font-medium">Serviço</th>
                  <th className="lots-table-head-sticky px-4 py-2.5 font-medium">Descrição</th>
                  <th className="lots-table-head-sticky px-4 py-2.5 font-medium">Status</th>
                  <th className="lots-table-head-sticky px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {servicos.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/45">
                    <td className="px-4 py-3 font-medium text-foreground">{s.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.descricao ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          s.ativo
                            ? "bg-success/12 text-[color:var(--success)]"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {s.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => toggle(s)}>
                        {s.ativo ? "Desativar" : "Reativar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
