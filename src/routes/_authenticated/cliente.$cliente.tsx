import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { brandTitle } from "@/lib/brand";
import { detectClientPlatforms, type ClientPlatformRouteKey } from "@/lib/platform-availability";
import { ClienteWorkspaceProvider } from "@/components/lotus/cliente-workspace-context";
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

      let queryName: string | null = null;

      if (cad?.nome_cliente) {
        const { data: ativo, error } = await supabase
          .from("vw_clientes_ativos")
          .select("cliente")
          .eq("cliente", cad.nome_cliente)
          .maybeSingle();
        if (error) throw error;
        queryName = ativo?.cliente ?? cad.nome_cliente;
      } else {
        const { data: ativos, error: errAtivos } = await supabase
          .from("vw_clientes_ativos")
          .select("cliente");
        if (errAtivos) throw errAtivos;
        const match = (ativos ?? []).find(
          (r: { cliente: string }) => slugify(r.cliente) === slugify(slug),
        );
        queryName = match?.cliente ?? null;
      }

      if (!queryName) {
        if (import.meta.env.DEV) {
          console.warn("[cliente-ref] sem match para slug", slug);
        }
        return null;
      }
      return {
        slug,
        nome: cad?.nome_cliente ?? queryName,
        queryName,
        cadastroId: cad?.id ?? null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

export type PlatformKey = ClientPlatformRouteKey;

export const clientePlatformsQuery = (queryName: string) =>
  queryOptions({
    queryKey: ["cliente-platforms", queryName],
    queryFn: () => detectClientPlatforms(queryName),
    staleTime: 5 * 60 * 1000,
  });

// ---------------- Route ----------------

export const Route = createFileRoute("/_authenticated/cliente/$cliente")({
  head: ({ params }) => ({ meta: [{ title: brandTitle(params.cliente) }] }),
  component: ClienteLayout,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="lotus-surface p-6 text-sm text-muted-foreground">Cliente não encontrado.</div>
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

      <Suspense fallback={<div className="lotus-skeleton h-96 w-full rounded-xl" />}>
        <ClienteShell slug={slug} />
      </Suspense>
    </div>
  );
}

function ClienteShell({ slug }: { slug: string }) {
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));

  if (!ref) {
    return (
      <div className="lotus-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <ClienteWorkspaceProvider queryName={ref.queryName}>
        <Outlet />
      </ClienteWorkspaceProvider>
    </div>
  );
}
