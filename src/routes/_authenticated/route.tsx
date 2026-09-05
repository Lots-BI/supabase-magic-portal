import { useEffect, useState } from "react";
import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { bootstrapSupabase, supabase } from "@/integrations/supabase/client";
import { resolveBlockedRedirect } from "@/modules/access/services/resolve-blocked-redirect";
import { useSignOut } from "@/modules/auth";
import { assertAccessActive } from "@/lib/access.functions.server";
import { checkIsAdmin } from "@/lib/admin.functions";
import { AppShell, type NavGroup } from "@/components/lotus/AppShell";
import { AuthDiagnosticsBanner } from "@/components/lotus/infra/AuthDiagnosticsBanner";
import { NotificationCenter } from "@/components/lotus/NotificationCenter";
import { useClientNavAccount } from "@/components/lotus/dashboards-nav";
import { BRAND_NAME } from "@/lib/brand";
import { FEATURE_PLANO_ESTRATEGICO_NAV } from "@/lib/feature-flags";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";
import "@/modules/os-bootstrap";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  LogOut,
  Sparkles,
  UserCircle2,
  Bug,
  FileBarChart,
  ClipboardCheck,
  BookOpen,
  Compass,
  Palette,
  Building2,
  GraduationCap,
  BrainCircuit,
  SwatchBook,
  Plug,
} from "lucide-react";
import { lazy, Suspense } from "react";

const GlobalSearch = lazy(() =>
  import("@/components/lotus/GlobalSearch").then((m) => ({ default: m.GlobalSearch })),
);
const ImpersonateClienteMenu = lazy(() =>
  import("@/components/lotus/ImpersonateClienteMenu").then((m) => ({
    default: m.ImpersonateClienteMenu,
  })),
);

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    await bootstrapSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const isOwner = isPlatformOwnerEmail(data.user.email);
    let isAdmin = isOwner;
    if (!isOwner) {
      const result = await context.queryClient.fetchQuery({
        queryKey: ["me", "isAdmin"],
        queryFn: () => checkIsAdmin(),
      });
      isAdmin = !!result?.isAdmin;
    }

    if (location.pathname.startsWith("/admin") && !isAdmin) {
      throw redirect({ to: "/dashboard" });
    }

    const access = await context.queryClient.fetchQuery({
      queryKey: ["me", "accessActive"],
      queryFn: () => assertAccessActive(),
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!access.ok) {
      const blocked = resolveBlockedRedirect(access.effective_status, Boolean(session));
      if (blocked.signOut) {
        await supabase.auth.signOut();
      }
      throw redirect({ to: blocked.to, search: blocked.search });
    }

    return { user: data.user, isAdmin };
  },
  component: AuthenticatedLayout,
});

function ShellSearchSlot({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Suspense
      fallback={
        <div className="h-10 w-10 shrink-0 rounded-lg border border-border bg-card sm:w-24" />
      }
    >
      <GlobalSearch isAdmin={isAdmin} />
    </Suspense>
  );
}

function ShellImpersonateSlot() {
  return (
    <Suspense fallback={null}>
      <ImpersonateClienteMenu />
    </Suspense>
  );
}

function AuthenticatedLayout() {
  const { user, isAdmin } = Route.useRouteContext();
  const isOwner = isPlatformOwnerEmail(user.email);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const inAdmin = pathname.startsWith("/admin");
  const clienteSlugMatch = pathname.match(/^\/cliente\/([^/]+)/);
  const clienteSlug = clienteSlugMatch?.[1];
  const isClientBrandbook = /^\/cliente\/[^/]+\/brandbook\/?$/.test(pathname);
  const signOut = useSignOut(user.email);
  const clientNav = useClientNavAccount(pathname, !(inAdmin && isAdmin));
  const clientDashboards = clientNav.nav;
  const diretrizesSlug = clientNav.slug ?? clienteSlug;

  const adminGroups: NavGroup[] = [
    {
      label: "Operações",
      items: [
        { to: "/admin/central", label: "Central", icon: Building2, prefixMatch: false },
        { to: "/admin", label: "Visão geral", icon: LayoutDashboard },
        { to: "/admin/relatorios", label: "Relatórios", icon: FileBarChart },
        { to: "/admin/aprovacoes", label: "Aprovações", icon: ClipboardCheck },
        { to: "/admin/brandbook", label: "Diretrizes da Marca", icon: SwatchBook },
        ...(FEATURE_PLANO_ESTRATEGICO_NAV
          ? [{ to: "/admin/plano-estrategico", label: "Plano Estratégico", icon: Compass }]
          : []),
        { to: "/admin/clientes", label: "Clientes", icon: Users },
        { to: "/admin/usuarios", label: "Usuários", icon: UserCircle2 },
        { to: "/admin/servicos", label: "Serviços", icon: Briefcase },
      ],
    },
    {
      label: "Diagnóstico",
      items: [
        { to: "/admin/debug", label: "Painel operacional", icon: Bug },
        { to: "/admin/debug/views", label: "Auditoria de views", icon: Bug },
      ],
    },
    {
      label: "Plataforma",
      items: [
        { to: "/admin/conexoes", label: "Conexões", icon: Plug, prefixMatch: false },
        { to: "/admin/branding", label: "Branding", icon: Palette },
      ],
    },
    {
      label: "Ajuda",
      items: [
        ...(isOwner
          ? [{ to: "/admin/ai-workspace", label: "AI Workspace", icon: BrainCircuit }]
          : []),
        { to: "/admin/tutorial", label: "Tutorial", icon: GraduationCap },
        { to: "/novidades", label: "Novidades", icon: Sparkles },
        { to: "/admin/knowledge", label: "Knowledge Center", icon: BookOpen },
      ],
    },
  ];

  const clientGroups: NavGroup[] = [
    {
      label: "Dados",
      items: [
        clientDashboards,
        ...(FEATURE_PLANO_ESTRATEGICO_NAV
          ? [{ to: "/plano-estrategico", label: "Plano Estratégico", icon: Compass }]
          : []),
        {
          to: diretrizesSlug ? `/cliente/${diretrizesSlug}/aprovacoes` : "/aprovacoes",
          label: "Aprovações",
          icon: ClipboardCheck,
        },
        ...(diretrizesSlug
          ? [
              {
                to: `/cliente/${diretrizesSlug}/brandbook`,
                label: "Diretrizes da Marca",
                icon: SwatchBook,
              },
              {
                to: `/cliente/${diretrizesSlug}/conexoes`,
                label: "Conexões",
                icon: Plug,
              },
            ]
          : []),
        { to: "/tutorial", label: "Tutorial", icon: GraduationCap },
        { to: "/novidades", label: "Novidades", icon: Sparkles },
      ],
    },
    ...(isAdmin
      ? [
          {
            label: "Acesso interno",
            items: [{ to: "/admin", label: "Painel admin", icon: Sparkles, prefixMatch: false }],
          } as NavGroup,
        ]
      : []),
  ];

  const groups = inAdmin && isAdmin ? adminGroups : clientGroups;
  const variant: "admin" | "client" = inAdmin && isAdmin ? "admin" : "client";

  return (
    <AppShell
      variant={variant}
      fullBleed={isClientBrandbook}
      groups={groups}
      topRight={
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <ShellSearchSlot isAdmin={isAdmin} />
          <NotificationCenter />
          {inAdmin && isAdmin && <ShellImpersonateSlot />}
          <div className="hidden text-right md:block">
            <p className="text-[12px] font-medium leading-tight text-foreground">
              {user.email?.split("@")[0]}
            </p>
            <p className="text-[10.5px] leading-tight text-muted-foreground">
              {isAdmin ? "Administrador" : "Cliente"}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sair da conta"
            className="lotus-focus inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-0 text-xs font-medium text-muted-foreground transition-colors hover:border-primary-300 hover:text-foreground active:scale-[0.98] sm:h-9 sm:min-w-0 sm:px-3"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      }
      bottomSlot={
        <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/60 px-2.5 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-[12px] font-semibold text-primary-foreground">
            {user.email?.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-sidebar-foreground">{user.email}</p>
            <p className="text-[10.5px] text-muted-foreground">
              {isAdmin ? `Admin · ${BRAND_NAME}` : `Cliente · ${BRAND_NAME}`}
            </p>
          </div>
        </div>
      }
    >
      {inAdmin && isAdmin && <AuthDiagnosticsBanner />}
      <Outlet />
    </AppShell>
  );
}
