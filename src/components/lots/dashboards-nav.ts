import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard } from "lucide-react";
import { dashboardAccountsQuery } from "@/lib/dashboard-accounts-query";
import { dashboardNavTargets } from "@/lib/dashboards-catalog";
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
  const { data: accounts = [] } = useQuery({
    ...dashboardAccountsQuery,
    enabled,
  });

  const slugFromPath = pathname.match(/^\/cliente\/([^/]+)/)?.[1];
  const single = accounts.length === 1 ? accounts[0]!.slug : undefined;
  const slug = slugFromPath ?? single;
  const platforms = accounts.find((account) => account.slug === slug)?.platforms ?? [];

  return {
    slug,
    nav: dashboardsNavItem(slug, platforms),
  };
}
