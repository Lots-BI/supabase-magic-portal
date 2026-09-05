import { QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportClientError } from "../lib/error-reporting";
import {
  BRAND_ASSETS,
  BRAND_COLORS,
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_OG_DESCRIPTION,
  BRAND_OG_IMAGE_HEIGHT,
  BRAND_OG_IMAGE_WIDTH,
  BRAND_TAGLINE,
  BRAND_URL,
} from "../lib/brand";
import { ThemeProvider } from "@/components/lots/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SupabaseBootstrapGate } from "@/components/lots/SupabaseConfigGuard";
import { supabase, isSupabaseReady } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportClientError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Não foi possível carregar esta página
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado do nosso lado. Tente atualizar ou volte ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: BRAND_NAME },
      { name: "description", content: BRAND_DESCRIPTION },
      { name: "application-name", content: BRAND_NAME },
      { name: "apple-mobile-web-app-title", content: BRAND_NAME },
      { name: "theme-color", content: BRAND_COLORS.purple },
      { property: "og:title", content: BRAND_NAME },
      { property: "og:description", content: BRAND_OG_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${BRAND_URL}/` },
      { property: "og:site_name", content: BRAND_NAME },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:image", content: BRAND_ASSETS.ogImage },
      { property: "og:image:secure_url", content: BRAND_ASSETS.ogImage },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: String(BRAND_OG_IMAGE_WIDTH) },
      { property: "og:image:height", content: String(BRAND_OG_IMAGE_HEIGHT) },
      { property: "og:image:alt", content: `${BRAND_NAME} — ${BRAND_TAGLINE}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: BRAND_NAME },
      { name: "twitter:description", content: BRAND_OG_DESCRIPTION },
      { name: "twitter:image", content: BRAND_ASSETS.ogImage },
      { name: "twitter:image:alt", content: `${BRAND_NAME} — ${BRAND_TAGLINE}` },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: `${BRAND_URL}/` },
      { rel: "icon", type: "image/png", href: BRAND_ASSETS.favicon },
      { rel: "apple-touch-icon", href: BRAND_ASSETS.appleTouchIcon },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // Prevent FOUC by reading stored theme before hydration.
  const themeScript = `(function(){try{var k='lots-bi-theme';var t=localStorage.getItem(k)||localStorage.getItem('lotus-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var v=t||(d?'dark':'light');if(v==='dark')document.documentElement.classList.add('dark');document.documentElement.style.colorScheme=v;}catch(e){}})();`;
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseReady()) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.invalidate();
        queryClient.clear();
        return;
      }
      if (event === "USER_UPDATED") {
        void queryClient.invalidateQueries({ queryKey: ["me"] });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SupabaseBootstrapGate>
          <TooltipProvider delayDuration={300}>
            <Outlet />
            <Toaster position="top-right" richColors closeButton />
          </TooltipProvider>
        </SupabaseBootstrapGate>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
