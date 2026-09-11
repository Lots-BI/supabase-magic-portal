import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { brandTitle } from "@/lib/brand";
import { detectClientPlatforms, type ClientPlatformRouteKey } from "@/lib/platform-availability";
import { mergeDashboardPlatforms } from "@/lib/dashboard-accounts";
import { listHubPluginsForCadastroFn } from "@/modules/dashboards/dashboard-accounts.server";
import { ClienteWorkspaceProvider } from "@/components/lots/cliente-workspace-context";
import { slugify } from "@/lib/slug";

// ---------------- Shared helpers (used by child routes) ----------------

export type ClienteRef = {
  slug: string;
  nome: string;
  queryName: string;
  cadastroId: number | null;
};

export const clienteRefQuery = (slug: string) =>
  queryOptions({
    queryKey: ["cliente-ref", slug],
    queryFn: async (): Promise<ClienteRef | null> => {
      const { data: cad } = await supabase
        .from("cadastro_clientes")
        .select("id, slug, nome_cliente")
        .eq("slug", slugify(slug))
        .maybeSingle();

      if (cad?.nome_cliente) {
        return {
          slug,
          nome: cad.nome_cliente,
          queryName: cad.nome_cliente,
          cadastroId: cad.id ?? null,
        };
      }

      const { data: ativos, error: errAtivos } = await supabase.rpc("portfolio_clientes_ativos");
      if (errAtivos) throw errAtivos;
      const match = (ativos ?? []).find(
        (row: { cliente: string }) => slugify(row.cliente) === slugify(slug),
      );
      if (!match?.cliente) {
        if (import.meta.env.DEV) {
          console.warn("[cliente-ref] sem match para slug", slug);
        }
        return null;
      }
      return {
        slug,
        nome: match.cliente,
        queryName: match.cliente,
        cadastroId: null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

export type PlatformKey = ClientPlatformRouteKey;

export const clientePlatformsQuery = (queryName: string, cadastroId?: number | null) =>
  queryOptions({
    queryKey: ["cliente-platforms", queryName, cadastroId ?? null],
    queryFn: async () => {
      const fromViews = await detectClientPlatforms(queryName);
      if (!cadastroId) return fromViews;
      const hubPlugins = await listHubPluginsForCadastroFn({
        data: { cadastroClienteId: cadastroId },
      });
      return mergeDashboardPlatforms(fromViews, hubPlugins);
    },
    staleTime: 5 * 60 * 1000,
  });

// ---------------- Route ----------------

export const Route = createFileRoute("/_authenticated/cliente/$cliente")({
  head: ({ params }) => ({ meta: [{ title: brandTitle(params.cliente) }] }),
  component: ClienteLayout,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="lots-surface p-6 text-sm text-muted-foreground">Cliente não encontrado.</div>
  ),
});

function ClienteLayout() {
  const { cliente: slug } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDiretrizes = /\/brandbook\/?$/.test(pathname);

  return (
    <div className={isDiretrizes ? undefined : "space-y-5"}>
      {isDiretrizes ? null : (
        <div>
          <Link
            to="/dashboard"
            className="inline-flex min-h-[44px] items-center gap-1 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden /> Voltar aos dashboards
          </Link>
        </div>
      )}

      <Suspense fallback={<div className="lots-skeleton h-96 w-full rounded-xl" />}>
        <ClienteShell slug={slug} />
      </Suspense>
    </div>
  );
}

function ClienteShell({ slug }: { slug: string }) {
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));

  if (!ref) {
    return (
      <div className="lots-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <ClienteWorkspaceProvider queryName={ref.queryName} cadastroId={ref.cadastroId}>
        <Outlet />
      </ClienteWorkspaceProvider>
    </div>
  );
}
