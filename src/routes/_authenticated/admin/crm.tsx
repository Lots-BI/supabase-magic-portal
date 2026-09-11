import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader } from "@/components/lots/PageHeader";
import { PeriodToggle, type PeriodDays } from "@/components/lots/PeriodToggle";
import { adminTitle } from "@/lib/brand";
import { slugify } from "@/lib/slug";
import { listCrmPortfolioFn } from "@/modules/crm/crm.server";
import { crmKeys } from "@/modules/crm/query-keys";
import { Contact2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/crm")({
  head: () => ({ meta: [{ title: adminTitle("CRM") }] }),
  component: AdminCrmHub,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
});

function AdminCrmHub() {
  const [days, setDays] = useState<PeriodDays>(30);
  const listFn = useServerFn(listCrmPortfolioFn);
  const query = useQuery({
    queryKey: crmKeys.portfolio(days),
    queryFn: () => listFn({ data: { days } }),
  });

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Dados"
        title="CRM"
        description="Audiência de cada marca — caixa de entrada unificada (WhatsApp, Direct, formulário, comentário). Clique para abrir."
        actions={<PeriodToggle value={days} onChange={setDays} />}
      />
      <div className="lots-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Pessoas</th>
              <th className="px-4 py-3 font-medium">Ativas 7d</th>
              <th className="px-4 py-3 font-medium">Comentários</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((row) => {
              const slug = row.clienteSlug || slugify(row.clienteNome);
              return (
                <tr key={row.cadastroClienteId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      to="/cliente/$cliente/crm"
                      params={{ cliente: slug }}
                      className="inline-flex items-center gap-2 font-medium hover:underline"
                    >
                      <Contact2 className="h-4 w-4 text-muted-foreground" />
                      {row.clienteNome}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.people}</td>
                  <td className="px-4 py-3">{row.active7d}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.commentsStatus}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {query.isLoading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Carregando portfólio…</p>
        ) : null}
      </div>
    </div>
  );
}
