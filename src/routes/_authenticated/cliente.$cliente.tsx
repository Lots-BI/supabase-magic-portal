import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense, type ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Instagram,
  Facebook,
  BarChart3,
  Globe,
  Music2,
  LayoutDashboard,
  Megaphone,
  Images,
  type LucideIcon,
  Compass,
  ClipboardCheck,
} from "lucide-react";
import { brandTitle } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { detectClientPlatforms, type ClientPlatformRouteKey } from "@/lib/platform-availability";
import { SyncStatusBar } from "@/components/lotus/SyncStatusBar";
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

const PLATFORM_META: Record<PlatformKey, { label: string; icon: LucideIcon; path: string }> = {
  instagram: {
    label: "Instagram",
    icon: Instagram,
    path: "/cliente/$cliente/instagram",
  },
  "meta-ads": {
    label: "Meta Ads",
    icon: Facebook,
    path: "/cliente/$cliente/meta-ads",
  },
  "google-ads": {
    label: "Google Ads",
    icon: Megaphone,
    path: "/cliente/$cliente/google-ads",
  },
  ga4: {
    label: "Google Analytics 4",
    icon: BarChart3,
    path: "/cliente/$cliente/ga4",
  },
  "google-business": {
    label: "Google Business",
    icon: Globe,
    path: "/cliente/$cliente/google-business",
  },
  tiktok: {
    label: "TikTok",
    icon: Music2,
    path: "/cliente/$cliente/tiktok",
  },
};

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

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/dashboard"
          className="inline-flex min-h-[44px] items-center gap-1 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden /> Voltar ao painel
        </Link>
      </div>

      <Suspense fallback={<LayoutSkeleton />}>
        <ClienteShell slug={slug} />
      </Suspense>
    </div>
  );
}

function LayoutSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="lotus-skeleton h-64 w-full" />
      <div className="lotus-skeleton h-96 w-full" />
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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
      <aside className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-3 sm:-mx-6 lg:static lg:top-20 lg:z-auto lg:mx-0 lg:self-start">
        <Suspense fallback={<div className="lotus-skeleton h-14 w-full rounded-xl lg:h-48" />}>
          <PlatformSideNav slug={slug} queryName={ref.queryName} />
        </Suspense>
      </aside>
      <div className="min-w-0 space-y-5">
        <SyncStatusBar queryName={ref.queryName} />
        <Outlet />
      </div>
    </div>
  );
}

function PlatformSideNav({ slug, queryName }: { slug: string; queryName: string }) {
  const { data: platforms } = useSuspenseQuery(clientePlatformsQuery(queryName));
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="lotus-surface min-w-0 overflow-hidden lg:flex lg:flex-col lg:gap-0.5 lg:p-2"
      aria-label="Navegação do cliente"
    >
      <div className="lotus-scroll-x flex gap-1 p-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-0">
        <p className="hidden px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:block">
          Conta
        </p>
        <SubNavLink
          to="/cliente/$cliente"
          params={{ cliente: slug }}
          pathname={pathname}
          href={`/cliente/${slug}`}
          icon={LayoutDashboard}
          label="Visão geral"
          exact
        />
        <SubNavLink
          to="/cliente/$cliente/plano-estrategico"
          params={{ cliente: slug }}
          pathname={pathname}
          href={`/cliente/${slug}/plano-estrategico`}
          icon={Compass}
          label="Plano Estratégico"
        />
        <SubNavLink
          to="/cliente/$cliente/aprovacoes"
          params={{ cliente: slug }}
          pathname={pathname}
          href={`/cliente/${slug}/aprovacoes`}
          icon={ClipboardCheck}
          label="Aprovações"
        />
        {platforms.includes("instagram") && (
          <SubNavLink
            to="/cliente/$cliente/publicacoes"
            params={{ cliente: slug }}
            pathname={pathname}
            href={`/cliente/${slug}/publicacoes`}
            icon={Images}
            label="Publicações"
          />
        )}

        <p className="hidden px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:mt-3 lg:block">
          Plataformas
        </p>

        {platforms.length === 0 && (
          <p className="hidden px-3 py-2 text-[11.5px] text-muted-foreground lg:block">
            Nenhuma plataforma com dados ainda.
          </p>
        )}

        {platforms.map((p) => {
          const meta = PLATFORM_META[p];
          const href = meta.path.replace("$cliente", slug);
          return (
            <SubNavLink
              key={p}
              to={meta.path}
              params={{ cliente: slug }}
              pathname={pathname}
              href={href}
              icon={meta.icon}
              label={meta.label}
            />
          );
        })}
      </div>
    </nav>
  );
}

function SubNavLink({
  to,
  params,
  href,
  label,
  icon: Icon,
  pathname,
  exact,
}: {
  to: string;
  params: Record<string, string>;
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  pathname: string;
  exact?: boolean;
}) {
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      to={to as never}
      params={params as never}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
        "min-h-[44px] lg:w-full lg:shrink",
        active
          ? "bg-primary/12 text-primary-700 dark:text-primary-200"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground active:scale-[0.98]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="whitespace-nowrap lg:truncate">{label}</span>
    </Link>
  );
}
