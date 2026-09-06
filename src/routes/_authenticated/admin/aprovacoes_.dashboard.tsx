import { adminTitle } from "@/lib/brand";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listClientes } from "@/lib/admin.functions";
import { OpsDashboardPanel } from "@/components/lots/approval/dashboard/OpsDashboardPanel";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";

export const Route = createFileRoute("/_authenticated/admin/aprovacoes_/dashboard")({
  head: () => ({ meta: [{ title: adminTitle("Dashboard — Conteúdos") }] }),
  component: AprovacoesDashboardPage,
});

function AprovacoesDashboardPage() {
  const listClientesFn = useServerFn(listClientes);
  const [clienteId, setClienteId] = useState<string>("all");

  const clientesQ = useQuery({
    queryKey: ["admin", "clientes"],
    queryFn: () => listClientesFn(),
  });

  if (clientesQ.isLoading) return <DashboardSkeleton kpiCount={4} withChart={false} />;

  const clientes = (clientesQ.data ?? []).filter((c: { ativo?: boolean }) => c.ativo !== false);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operações"
        title="Dashboard operacional"
        description="Métricas derivadas de content_cards e content_card_events — visão da agência."
        actions={
          <Button variant="outline" asChild>
            <Link to="/admin/aprovacoes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Workspace
            </Link>
          </Button>
        }
      />

      <SectionCard title="Escopo" description="Todos os clientes ou um cliente específico.">
        <Select value={clienteId} onValueChange={setClienteId}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Escopo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clientes.map((c: { id: number; nome_cliente: string }) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nome_cliente}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SectionCard>

      <OpsDashboardPanel cadastroClienteId={clienteId === "all" ? undefined : Number(clienteId)} />
    </div>
  );
}
