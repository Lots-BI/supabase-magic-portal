import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { resolveDashboardPath } from "@/lib/dashboards-catalog";
import { PlatformBrandMark } from "./PlatformBrandMark";
import type { NavGroup, NavItem } from "./AppShell";

interface SidebarNavProps {
  groups: NavGroup[];
  /** Fecha drawer mobile após navegar. */
  onNavigate?: () => void;
  className?: string;
}

function itemHref(item: NavItem) {
  return resolveDashboardPath(item.to, item.params);
}

function isItemActive(pathname: string, item: NavItem) {
  const href = itemHref(item);
  return (
    pathname === href ||
    (item.prefixMatch !== false && pathname.startsWith(`${href}/`)) ||
    (item.prefixMatch !== false && pathname.startsWith(href) && href !== "/")
  );
}

export function SidebarNav({ groups, onNavigate, className }: SidebarNavProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className={cn("flex-1 overflow-y-auto overscroll-contain px-3 pb-6 pt-2", className)}
      aria-label="Navegação principal"
    >
      {groups.map((group, gi) => (
        <div key={gi} className={cn(gi > 0 && "mt-6")}>
          {group.label && (
            <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <NavTreeItem
                key={itemHref(item)}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavTreeItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const children = item.children ?? [];
  const childActive = children.some((child) => isItemActive(pathname, child));
  const selfActive = isItemActive(pathname, item) && !childActive;

  return (
    <li>
      <NavLink item={item} active={selfActive} onNavigate={onNavigate} />
      {children.length > 0 ? (
        <ul
          className="ml-[1.35rem] mt-0.5 space-y-0.5 border-l border-sidebar-border/80 pl-2"
          aria-label={`Dashboards de ${item.label}`}
        >
          {children.map((child) => (
            <li key={itemHref(child)}>
              <NavLink
                item={child}
                active={isItemActive(pathname, child)}
                nested
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function NavLink({
  item,
  active,
  nested = false,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      params={item.params}
      onClick={() => onNavigate?.()}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg font-medium text-sidebar-foreground/80 transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "active:scale-[0.98]",
        nested ? "min-h-[40px] px-2.5 py-2 text-[12.5px]" : "min-h-[44px] px-3 py-2.5 text-[13px]",
        active && "bg-sidebar-accent text-sidebar-accent-foreground",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary"
        />
      )}
      {item.brandMark ? (
        <PlatformBrandMark
          dashboardId={item.brandMark}
          className={cn(
            "shrink-0",
            nested ? "h-3.5 w-3.5" : "h-4 w-4",
            active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
          )}
        />
      ) : (
        <Icon
          className={cn(
            "shrink-0 transition-colors",
            nested ? "h-3.5 w-3.5" : "h-4 w-4",
            active
              ? "text-primary-600 dark:text-primary-300"
              : "text-muted-foreground group-hover:text-foreground",
          )}
          aria-hidden
        />
      )}
      <span className="truncate">{item.label}</span>
      {item.badge != null && (
        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[10.5px] font-semibold text-primary-700 dark:text-primary-200">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
