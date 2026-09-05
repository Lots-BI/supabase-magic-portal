import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Plug } from "lucide-react";
import { SectionCard } from "@/components/lots/SectionCard";
import { EmptyState } from "@/components/lots/EmptyState";
import { Button } from "@/components/ui/button";
import { getClientHubConnections } from "@/modules/platform-hub-admin/hub-admin.server";
import { hubAdminKeys } from "@/modules/platform-hub-admin/query-keys";
import { HubHealthBadge, HubProviderBadge } from "./hub-badges";

interface ClientHubConnectionsSectionProps {
  cadastroId: number;
  clienteNome: string;
}

export function ClientHubConnectionsSection({
  cadastroId,
  clienteNome,
}: ClientHubConnectionsSectionProps) {
  const { data: connections, isLoading } = useQuery({
    queryKey: hubAdminKeys.clientConnections(cadastroId),
    queryFn: () => getClientHubConnections({ data: { cadastroId } }),
  });

  return (
    <SectionCard
      title="Conexões Platform Hub"
      description={`Plataformas conectadas via Hub para ${clienteNome}.`}
      actions={
        <Button asChild size="sm" variant="outline" className="lots-focus">
          <Link to="/admin/conexoes/nova" search={{}}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Conectar
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-2 p-4">
          {[1, 2].map((i) => (
            <div key={i} className="lots-skeleton h-14 rounded-lg" />
          ))}
        </div>
      ) : !connections?.length ? (
        <EmptyState
          icon={Plug}
          title="Nenhuma conexão Hub"
          description="Conecte plataformas de anúncios e analytics sem configurar Make ou scripts."
          action={
            <Button asChild size="sm">
              <Link to="/admin/conexoes/nova" search={{}}>
                Conectar plataforma
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border">
          {connections.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  to="/admin/conexoes/$connectionId"
                  params={{ connectionId: c.id }}
                  className="font-medium hover:underline"
                >
                  {c.label}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {c.pluginKey} ·{" "}
                  {c.lastSyncAt
                    ? `Sync ${new Date(c.lastSyncAt).toLocaleString("pt-BR")}`
                    : "Sem sync"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <HubProviderBadge provider={c.activeProviderType} />
                <HubHealthBadge status={c.healthStatus} score={c.healthScore} />
                {c.coverage !== null && (
                  <span className="text-xs text-muted-foreground">
                    {(c.coverage * 100).toFixed(0)}% coverage
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
