import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/lots/PageHeader";
import { PeriodToggle, type PeriodDays } from "@/components/lots/PeriodToggle";
import { adminTitle } from "@/lib/brand";
import { slugify } from "@/lib/slug";
import { listLeadsPortfolioFn } from "@/modules/crm/crm.server";
import { crmKeys } from "@/modules/crm/query-keys";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  head: () => ({ meta: [{ title: adminTitle("Central de Leads") }] }),
  component: AdminLeadsHub,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-danger">
      Erro: {error instanceof Error ? error.message : String(error)}
    </div>
  ),
});

function AdminLeadsHub() {
  const [days, setDays] = useState<PeriodDays>(30);
  const listFn = useServerFn(listLeadsPortfolioFn);
  const query = useQuery({
    queryKey: crmKeys.leadsPortfolio(days),
    queryFn: () => listFn({ data: { days } }),
  });

  const rows = query.data ?? [];
  const totals = rows.reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      landing: acc.landing + row.landing,
      instant: acc.instant + row.instant,
    }),
    { total: 0, landing: 0, instant: 0 },
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Dados"
        title="Central de Leads"
        description="Leads de todos os clientes num só lugar — landing e formulário instantâneo de campanha da Meta. Clique num cliente para abrir o detalhe."
        actions={<PeriodToggle value={days} onChange={setDays} />}
      />

      <div className="lots-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Envios</th>
              <th className="px-4 py-3 font-medium">Landing</th>
              <th className="px-4 py-3 font-medium">Instantâneo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const slug = row.clienteSlug || slugify(row.clienteNome);
              return (
                <tr key={row.cadastroClienteId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      to="/cliente/$cliente/leads"
                      params={{ cliente: slug }}
                      className="inline-flex items-center gap-2 font-medium hover:underline"
                    >
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      {row.clienteNome}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.total}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.landing}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.instant}</td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 ? (
            <tfoot>
              <tr className="border-t border-border text-xs text-muted-foreground">
                <td className="px-4 py-3 font-medium">Total</td>
                <td className="px-4 py-3 font-medium">{totals.total}</td>
                <td className="px-4 py-3">{totals.landing}</td>
                <td className="px-4 py-3">{totals.instant}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
        {query.isLoading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Carregando portfólio…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum lead no período.</p>
        ) : null}
      </div>
    </div>
  );
}
