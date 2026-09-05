import { useEffect, useState } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
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
        <div key={gi} className={cn(gi > 0 && "mt-5 border-t border-sidebar-border pt-5")}>
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
  const router = useRouter();
  const children = item.children ?? [];
  const hasChildren = children.length > 0;
  const childActive = children.some((child) => isItemActive(pathname, child));
  const selfActive = isItemActive(pathname, item) && !childActive;
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  if (!hasChildren) {
    return (
      <li>
        <NavLink item={item} active={selfActive} onNavigate={onNavigate} />
      </li>
    );
  }

  const parentActive = selfActive || childActive;

  function toggleMenu() {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (next && !childActive) {
        void router.navigate({ to: item.to, params: item.params });
      }
      return next;
    });
  }

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`nav-submenu-${item.label}`}
        onClick={toggleMenu}
        className={cn(
          "group relative flex w-full items-center gap-2.5 rounded-lg text-left font-medium text-sidebar-foreground transition-colors",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          "active:scale-[0.98]",
          "min-h-[44px] px-3 py-2.5 text-[13px]",
          parentActive && "bg-sidebar-accent text-sidebar-accent-foreground",
        )}
      >
        {parentActive && (
          <span
            aria-hidden
            className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r-full bg-primary"
          />
        )}
        <item.icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            parentActive
              ? "text-primary-600 dark:text-primary-300"
              : "text-muted-foreground group-hover:text-foreground",
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          id={`nav-submenu-${item.label}`}
          className="ml-[1.35rem] mt-0.5 space-y-0.5 border-l-2 border-sidebar-border pl-2"
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
        "group relative flex items-center gap-2.5 rounded-lg font-medium text-sidebar-foreground transition-colors",
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
