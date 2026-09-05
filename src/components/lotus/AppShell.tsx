import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { LotusWordmark } from "./LotusMark";
import { ThemeToggle } from "./ThemeToggle";
import { SidebarNav } from "./SidebarNav";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  prefixMatch?: boolean;
  badge?: ReactNode;
  params?: { cliente: string };
  children?: NavItem[];
  brandMark?: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export interface AppShellProps {
  children: ReactNode;
  groups: NavGroup[];
  variant?: "admin" | "client";
  /** Conteúdo edge-to-edge (ex.: brand book do cliente). */
  fullBleed?: boolean;
  topRight?: ReactNode;
  bottomSlot?: ReactNode;
}

export function AppShell({
  children,
  groups,
  variant = "admin",
  fullBleed = false,
  topRight,
  bottomSlot,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="lotus-app-shell min-h-screen min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      {/* Desktop sidebar (lg+) */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-sidebar-border bg-sidebar lg:flex"
        aria-label="Barra lateral"
      >
        <div className="flex h-14 shrink-0 items-center px-5 pt-[env(safe-area-inset-top)]">
          <Link to="/" className="lotus-focus rounded-md">
            <LotusWordmark />
          </Link>
        </div>
        <SidebarNav groups={groups} />
        {bottomSlot && (
          <div className="shrink-0 border-t border-sidebar-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {bottomSlot}
          </div>
        )}
      </aside>

      {/* Mobile / tablet drawer (< lg) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="flex w-[min(100vw-2rem,280px)] max-w-[280px] flex-col gap-0 border-sidebar-border bg-sidebar p-0 pt-[env(safe-area-inset-top)] [&>button]:top-[max(0.875rem,env(safe-area-inset-top))]"
          aria-describedby={undefined}
        >
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-5">
            <Link to="/" className="lotus-focus rounded-md" onClick={closeMobile}>
              <LotusWordmark />
            </Link>
          </div>
          <SidebarNav groups={groups} onNavigate={closeMobile} className="flex-1" />
          {bottomSlot && (
            <div className="shrink-0 border-t border-sidebar-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {bottomSlot}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 lg:pl-[248px]">
        <div
          className={cn(
            "flex h-14 min-h-[3.5rem] items-center gap-2 px-3 pt-[env(safe-area-inset-top)] sm:gap-3 sm:px-6",
            variant === "client" ? "lg:px-10" : "lg:px-8",
          )}
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu de navegação"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </Button>

          <Link
            to="/"
            className="lotus-focus min-w-0 shrink truncate rounded-md lg:hidden"
            aria-label="Início"
          >
            <LotusWordmark className="max-w-[140px] sm:max-w-none" />
          </Link>

          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">{topRight}</div>
          <ThemeToggle />
        </div>
      </header>

      <main className="lg:pl-[248px]" id="main-content">
        <div
          className={cn(
            "mx-auto w-full min-w-0 max-w-full pb-[max(0.5rem,env(safe-area-inset-bottom))]",
            fullBleed
              ? "max-w-none px-0 py-0"
              : variant === "admin"
                ? "max-w-[1400px] px-3 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7"
                : "max-w-[1240px] px-3 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10",
          )}
        >
          <div className="animate-lotus-fade min-w-0">{children}</div>
        </div>
      </main>
    </div>
  );
}
