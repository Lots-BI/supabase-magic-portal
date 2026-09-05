import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Figma, Github, Maximize2, Minimize2 } from "lucide-react";
import type { BrandbookEntry } from "@/lib/brandbook/registry";
import { getBrandbookLazyComponent } from "@/lib/brandbook/registry";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BrandbookViewerProps = {
  entry: BrandbookEntry;
  clientLabel?: string;
  /** Admin: painel com navegação. Cliente: apenas o brand book em tela cheia. */
  mode?: "admin" | "client";
};

export function BrandbookViewer({ entry, clientLabel, mode = "admin" }: BrandbookViewerProps) {
  const isClient = mode === "client";
  const [activeSection, setActiveSection] = useState(entry.sections[0]?.id ?? "");
  const [fullscreen, setFullscreen] = useState(false);
  const BrandbookComponent = useMemo(() => getBrandbookLazyComponent(entry), [entry]);

  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(sectionId);
  }, []);

  useEffect(() => {
    const root = isClient ? null : document.getElementById("brandbook-scroll-root");

    const ids = entry.sections.map((s) => s.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((r) => r.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      {
        root,
        rootMargin: isClient ? "-15% 0px -60% 0px" : "-20% 0px -55% 0px",
        threshold: [0.1, 0.35, 0.6],
      },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [entry.sections, entry.id, isClient]);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap";
    link.dataset.brandbookFonts = entry.id;
    document.head.appendChild(link);
    return () => {
      document.head.querySelector(`link[data-brandbook-fonts="${entry.id}"]`)?.remove();
    };
  }, [entry.id]);

  if (isClient) {
    return (
      <div id="brandbook-scroll-root" className="min-h-[calc(100dvh-3.5rem)] w-full">
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
              Carregando brand book…
            </div>
          }
        >
          <BrandbookComponent />
        </Suspense>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        fullscreen && "fixed inset-0 z-50 bg-background p-3 sm:p-4",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {mode === "client" ? "Diretrizes da Marca" : "Brand book"}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {entry.label}
            {clientLabel ? (
              <span className="font-normal text-muted-foreground"> · {clientLabel}</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {entry.figmaUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={entry.figmaUrl} target="_blank" rel="noopener noreferrer">
                <Figma className="h-3.5 w-3.5" />
                Figma
              </a>
            </Button>
          ) : null}
          <Button variant="outline" size="sm" asChild>
            <a href={entry.repoUrl} target="_blank" rel="noopener noreferrer">
              <Github className="h-3.5 w-3.5" />
              Repositório
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFullscreen((v) => !v)}
          >
            {fullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                Sair da tela cheia
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                Tela cheia
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Seções do brand book"
          className="lotus-surface sticky top-20 h-fit max-h-[calc(100vh-6rem)] overflow-y-auto p-3"
        >
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Seções
          </p>
          <ul className="space-y-1">
            {entry.sections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "lotus-focus w-full rounded-md px-2 py-1.5 text-left text-[12px] transition-colors",
                    activeSection === section.id
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-border/70 pt-3">
            <a
              href={entry.repoUrl.replace(/\.git$/, "")}
              target="_blank"
              rel="noopener noreferrer"
              className="lotus-focus inline-flex items-center gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Ver no GitHub <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </nav>

        <div
          id="brandbook-scroll-root"
          className={cn(
            "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
            fullscreen ? "h-[calc(100vh-7.5rem)]" : "h-[min(78vh,1100px)]",
          )}
        >
          <div className="h-full overflow-y-auto overscroll-contain">
            <Suspense
              fallback={
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  Carregando brand book…
                </div>
              }
            >
              <BrandbookComponent />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
