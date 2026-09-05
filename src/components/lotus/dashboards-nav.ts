import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard } from "lucide-react";
import { clientesAtivosQuery } from "@/lib/clientes-ativos";
import { dashboardNavTargets } from "@/lib/dashboards-catalog";
import { slugify } from "@/lib/slug";
import type { NavItem } from "./AppShell";

export function dashboardsNavItem(slug: string | undefined, platforms: string[]): NavItem {
  return {
    to: "/dashboard",
    label: "Dashboards",
    icon: LayoutDashboard,
    prefixMatch: false,
    children: slug
      ? dashboardNavTargets(slug, platforms).map((entry) => ({
          to: entry.to,
          params: entry.params,
          label: entry.label,
          icon: entry.icon,
          brandMark: entry.id,
          prefixMatch: false,
        }))
      : undefined,
  };
}

export function useClientNavAccount(pathname: string, enabled: boolean) {
  const { data: clientes = [] } = useQuery({
    ...clientesAtivosQuery,
    enabled,
  });

  const slugFromPath = pathname.match(/^\/cliente\/([^/]+)/)?.[1];
  const single = clientes.length === 1 ? slugify(clientes[0]!.cliente) : undefined;
  const slug = slugFromPath ?? single;
  const platforms =
    clientes.find((account) => slugify(account.cliente) === slug)?.plataformas_ativas ?? [];

  return {
    slug,
    nav: dashboardsNavItem(slug, platforms),
  };
}
