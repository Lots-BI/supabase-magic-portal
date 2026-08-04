import { Link } from "@tanstack/react-router";
import { Activity, Plug, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/lotus/PageHeader";
import { SectionCard } from "@/components/lotus/SectionCard";
import { EmptyState } from "@/components/lotus/EmptyState";
import { StatCard } from "@/components/lotus/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  PhConnectionAdminRowV1,
  PhConnectionsOverviewV1,
} from "@/modules/platform-hub-bridges/ph-persistence";
import type { PlatformCatalogItemV1 } from "@/modules/platform-hub-admin/types";
import type { PhTimelineEventV1 } from "@/modules/platform-hub-bridges/ph-persistence";
import { HubHealthBadge, HubProviderBadge, PlatformLogoBadge } from "./hub-badges";

interface ConnectionsHubViewProps {
  overview: PhConnectionsOverviewV1;
  connections: PhConnectionAdminRowV1[];
  catalog: PlatformCatalogItemV1[];
  timeline: PhTimelineEventV1[];
}

type GroupBy = "none" | "plugin" | "health" | "provider" | "client";

export function ConnectionsHubView({
  overview,
  connections,
  catalog,
  timeline,
}: ConnectionsHubViewProps) {
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return connections.filter((c) => {
      if (healthFilter !== "all" && c.healthStatus !== healthFilter) return false;
      if (providerFilter !== "all" && c.activeProviderType !== providerFilter) return false;
      if (!q) return true;
      return (
        c.label.toLowerCase().includes(q) ||
        c.pluginKey.toLowerCase().includes(q) ||
        (c.clienteNome?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [connections, search, healthFilter, providerFilter]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return { Todas: filtered };
    const map = new Map<string, PhConnectionAdminRowV1[]>();
    for (const c of filtered) {
      const key =
        groupBy === "plugin"
          ? c.pluginKey
          : groupBy === "health"
            ? c.healthStatus
            : groupBy === "provider"
              ? c.activeProviderType
              : (c.clienteNome ?? "Sem cliente");
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    return Object.fromEntries(map);
  }, [filtered, groupBy]);

  return (
    <div className="space-y-7 pb-10">
      <PageHeader
        eyebrow="Platform Hub"
        title="Conexões"
        description="Conecte plataformas oficiais, rode sync e compare com Make. Dashboards de cliente só mudam após cutover explícito."
        actions={
          <Button asChild className="lotus-focus">
            <Link to="/admin/conexoes/nova" search={{}}>
              <Plus className="mr-2 h-4 w-4" />
              Conectar plataforma
            </Link>
          </Button>
        }
      />

      {connections.length === 0 && (
        <EmptyState
          icon={Plug}
          title="Nenhuma plataforma conectada"
          description="No Marco 1: conecte Meta Ads (Official API) para 1 cliente piloto, autentique, escolha o Ad Account e rode o sync de teste."
          action={
            <Button asChild>
              <Link to="/admin/conexoes/nova" search={{ plugin: "meta_ads" }}>
                Conectar Meta Ads
              </Link>
            </Button>
          }
        />
      )}

      <div className="grid grid-cols-2 gap-3 min-[375px]:grid-cols-4 lg:grid-cols-8">
        <StatCard label="Total" value={overview.total} variant="compact" />
        <StatCard label="Saudáveis" value={overview.healthy} variant="compact" />
        <StatCard label="Degradadas" value={overview.degraded} variant="compact" />
        <StatCard label="Com erro" value={overview.withError} variant="compact" />
        <StatCard label="Make" value={overview.makePassive} variant="compact" />
        <StatCard label="Official" value={overview.officialApi} variant="compact" />
        <StatCard label="Desconhecidas" value={overview.unknown} variant="compact" />
        <StatCard label="Unhealthy" value={overview.unhealthy} variant="compact" />
      </div>

      <SectionCard title="Filtros" bodyClassName="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cliente, plataforma ou rótulo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar conexões"
            />
          </div>
          <Select value={healthFilter} onValueChange={setHealthFilter}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue placeholder="Health" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos health</SelectItem>
              <SelectItem value="healthy">Saudável</SelectItem>
              <SelectItem value="degraded">Degradada</SelectItem>
              <SelectItem value="unhealthy">Com erro</SelectItem>
              <SelectItem value="unknown">Desconhecido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos providers</SelectItem>
              <SelectItem value="official_api">Official API</SelectItem>
              <SelectItem value="make_passive">Make Passive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-full lg:w-44">
              <SelectValue placeholder="Agrupar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem agrupamento</SelectItem>
              <SelectItem value="plugin">Por plataforma</SelectItem>
              <SelectItem value="health">Por health</SelectItem>
              <SelectItem value="provider">Por provider</SelectItem>
              <SelectItem value="client">Por cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {Object.entries(grouped).map(([group, items]) => (
        <SectionCard key={group} title={groupBy === "none" ? "Conexões ativas" : group}>
          {items.length === 0 ? (
            <EmptyState
              icon={Plug}
              title="Nenhuma conexão"
              description="Ajuste os filtros ou conecte uma nova plataforma."
              action={
                <Button asChild>
                  <Link to="/admin/conexoes/nova" search={{}}>
                    Conectar plataforma
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {items.map((c) => (
                <Link
                  key={c.id}
                  to="/admin/conexoes/$connectionId"
                  params={{ connectionId: c.id }}
                  className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <PlatformLogoBadge pluginKey={c.pluginKey} />
                    <div>
                      <p className="font-medium text-foreground">{c.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {c.clienteNome ?? "—"} · {c.pluginKey}
                        {c.lastSyncAt && (
                          <> · Sync {new Date(c.lastSyncAt).toLocaleDateString("pt-BR")}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <HubHealthBadge status={c.healthStatus} score={c.healthScore} />
                    <HubProviderBadge provider={c.activeProviderType} />
                    {c.coverage !== null && (
                      <span className="text-xs text-muted-foreground">
                        {(c.coverage * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      ))}

      <SectionCard title="Catálogo de plataformas">
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          {catalog.map((p) => (
            <div
              key={p.key}
              className="lotus-surface rounded-xl border border-border p-4 transition-shadow hover:shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PlatformLogoBadge pluginKey={p.key} />
                  <div>
                    <p className="font-medium">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.key}</p>
                  </div>
                </div>
                <HubProviderBadge provider={p.defaultProvider} />
              </div>
              <p className="mb-2 text-xs text-muted-foreground">{p.capabilities.join(" · ")}</p>
              <p className="text-xs text-muted-foreground">
                {p.connectionCount} conexão(ões)
                {p.avgHealthScore !== null && ` · health médio ${p.avgHealthScore}`}
                {p.oauthType ? " · OAuth" : " · Credenciais"}
              </p>
              <Button asChild size="sm" className="mt-3 w-full lotus-focus" variant="outline">
                <Link to="/admin/conexoes/nova" search={{ plugin: p.key }}>
                  Conectar
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Atividade recente">
        {timeline.length === 0 ? (
          <EmptyState
            compact
            icon={Activity}
            title="Sem eventos"
            description="A timeline aparecerá aqui."
          />
        ) : (
          <ul className="divide-y divide-border">
            {timeline.slice(0, 15).map((e) => (
              <li key={e.id} className="px-4 py-3 text-sm">
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString("pt-BR")} · {e.kind}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/admin/conexoes/health">Painel Health</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/conexoes/migracao">Painel Migração</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/conexoes/testing">Testing Center</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/conexoes/rollout">Rollout Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
