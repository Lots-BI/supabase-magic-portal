import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listClientes, toggleClienteAtivo } from "@/lib/admin.functions";
import { PageHeader } from "@/components/lots/PageHeader";
import { Button } from "@/components/ui/button";
import { adminTitle } from "@/lib/brand";
import { Search, Plus, MoreHorizontal, Filter, X } from "lucide-react";

const clientesQuery = {
  queryKey: ["admin", "clientes"],
  queryFn: () => listClientes(),
};

export const Route = createFileRoute("/_authenticated/admin/clientes/")({
  head: () => ({ meta: [{ title: adminTitle("Clientes") }] }),
  loader: ({ context }) => (context as any).queryClient?.ensureQueryData(clientesQuery),
  component: ClientesList,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
});

function ClientesList() {
  const { data } = useSuspenseQuery(clientesQuery);
  const qc = useQueryClient();
  const router = useRouter();
  const [filter, setFilter] = useState<"todos" | "ativos" | "inativos">("todos");
  const [search, setSearch] = useState("");

  const all = data ?? [];
  const rows = all.filter((c: any) => {
    if (filter === "ativos" && !c.ativo) return false;
    if (filter === "inativos" && c.ativo) return false;
    if (search && !c.nome_cliente.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const hiddenCount = all.length - rows.length;
  const filterActive = filter !== "todos" || search.length > 0;

  const toggle = async (id: number, ativo: boolean, nome: string) => {
    if (!ativo && !confirm(`Desativar "${nome}"? O histórico será preservado.`)) return;
    const promise = toggleClienteAtivo({ data: { id, ativo } }).then(async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "clientes"] });
      await router.invalidate();
    });
    toast.promise(promise, {
      loading: ativo ? "Reativando…" : "Desativando…",
      success: ativo ? `${nome} reativado` : `${nome} desativado`,
      error: (e) => `Erro: ${e instanceof Error ? e.message : "falha"}`,
    });
  };

  const filters: Array<{ key: typeof filter; label: string; count: number }> = [
    { key: "todos", label: "Todos", count: all.length },
    { key: "ativos", label: "Ativos", count: all.filter((c: any) => c.ativo).length },
    { key: "inativos", label: "Inativos", count: all.filter((c: any) => !c.ativo).length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operações"
        title="Clientes"
        description="Gerencie o portfólio. Soft delete preserva todo o histórico de métricas, acessos e serviços."
        actions={
          <Button asChild>
            <Link to="/admin/clientes/novo" className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Novo cliente
            </Link>
          </Button>
        }
      />

      <div className="lots-surface overflow-hidden">
        {/* Toolbar */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 sm:flex sm:flex-wrap">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar cliente por nome…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="lots-focus h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[13px] placeholder:text-muted-foreground/70"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors " +
                  (filter === f.key
                    ? "bg-card text-foreground shadow-[var(--shadow-xs)]"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {f.label}
                <span className="text-[10.5px] text-muted-foreground/80">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter banner */}
        {filterActive && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2 text-[12px]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>
                Exibindo <strong className="text-foreground tabular-nums">{rows.length}</strong> de{" "}
                <strong className="text-foreground tabular-nums">{all.length}</strong> cliente
                {all.length === 1 ? "" : "s"}
                {hiddenCount > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="text-foreground">
                      {hiddenCount} oculto{hiddenCount === 1 ? "" : "s"}
                    </span>{" "}
                    pelo filtro
                  </>
                )}
              </span>
            </div>
            <button
              onClick={() => {
                setFilter("todos");
                setSearch("");
              }}
              className="lots-focus inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Limpar filtros
            </button>
          </div>
        )}

        {/* Table */}
        <div className="lots-table-scroll">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="lots-table-head-sticky px-4 py-2.5 font-medium">Cliente</th>
                <th className="lots-table-head-sticky px-4 py-2.5 font-medium">Empresa</th>
                <th className="lots-table-head-sticky px-4 py-2.5 font-medium">Serviços</th>
                <th className="lots-table-head-sticky px-4 py-2.5 font-medium">Acessos</th>
                <th className="lots-table-head-sticky px-4 py-2.5 font-medium">Status</th>
                <th className="lots-table-head-sticky px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nenhum cliente encontrado para este filtro.
                  </td>
                </tr>
              )}
              {rows.map((c: any) => (
                <tr key={c.id} className="lots-row border-t border-border">
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/clientes/$id"
                      params={{ id: String(c.id) }}
                      className="flex items-center gap-3"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary-100 to-secondary-100 text-[12px] font-semibold text-primary-700 dark:from-primary-700/40 dark:to-secondary-700/30 dark:text-primary-100">
                        {c.nome_cliente.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-foreground">
                          {c.nome_cliente}
                        </div>
                        {c.slug && (
                          <div className="truncate text-[11px] text-muted-foreground">
                            /{c.slug}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">
                    {c.empresa ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.servicos ?? []).length === 0 && (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                      {(c.servicos ?? []).slice(0, 3).map((s: string) => (
                        <span
                          key={s}
                          className="inline-flex items-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground"
                        >
                          {s}
                        </span>
                      ))}
                      {(c.servicos ?? []).length > 3 && (
                        <span className="text-[10.5px] text-muted-foreground">
                          +{c.servicos.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] tabular-nums text-muted-foreground">
                    {c.qtd_acessos ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                        (c.ativo
                          ? "bg-success/12 text-[color:var(--success)]"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      <span
                        className={
                          "h-1.5 w-1.5 rounded-full " +
                          (c.ativo ? "bg-success" : "bg-muted-foreground/50")
                        }
                      />
                      {c.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggle(c.id, !c.ativo, c.nome_cliente)}
                      className="lots-focus inline-flex h-7 items-center rounded-md border border-border bg-card px-2.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-primary-300 hover:text-foreground"
                    >
                      {c.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <MoreHorizontal className="h-3 w-3" />
        Apenas soft delete. Histórico de métricas, acessos e serviços é sempre preservado.
      </p>
    </div>
  );
}
