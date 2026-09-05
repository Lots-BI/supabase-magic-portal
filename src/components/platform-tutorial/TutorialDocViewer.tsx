import { Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TutorialDoc } from "@/lib/platform-tutorial";
import { tutorialBasePath, tutorialNavQuery, type TutorialAudience } from "@/lib/platform-tutorial";
import { KnowledgeMarkdown } from "@/components/knowledge-center/KnowledgeMarkdown";
import { KnowledgeToc } from "@/components/knowledge-center/KnowledgeToc";
import { useSuspenseQuery } from "@tanstack/react-query";

export function TutorialDocViewer({
  doc,
  audience,
}: {
  doc: TutorialDoc;
  audience: TutorialAudience;
}) {
  const { data: nav } = useSuspenseQuery(tutorialNavQuery(audience));
  const base = tutorialBasePath(audience);
  const idx = nav.findIndex((n) => n.slug === doc.slug);
  const prev = idx > 0 ? nav[idx - 1] : null;
  const next = idx >= 0 && idx < nav.length - 1 ? nav[idx + 1] : null;

  return (
    <div className="relative">
      <Link
        to={base}
        className="lots-focus mb-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Voltar ao índice
      </Link>

      <div className="flex gap-10">
        <article className="min-w-0 flex-1">
          <header className="mb-6 border-b border-border pb-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-primary">
              Capítulo {idx + 1} de {nav.length}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
              {doc.title}
            </h1>
            {doc.description && (
              <p className="mt-2 text-sm text-muted-foreground">{doc.description}</p>
            )}
          </header>

          <Suspense fallback={<div className="lots-skeleton h-96 w-full rounded-lg" />}>
            <KnowledgeMarkdown content={doc.body} currentDocPath={doc.path} />
          </Suspense>

          <nav className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            {prev?.slug ? (
              <Link
                to={`${base}/$`}
                params={{ _splat: prev.slug.replace(/^admin\/|^client\//, "") }}
                className="lots-focus inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                {prev.label}
              </Link>
            ) : (
              <span />
            )}
            {next?.slug ? (
              <Link
                to={`${base}/$`}
                params={{ _splat: next.slug.replace(/^admin\/|^client\//, "") }}
                className="lots-focus inline-flex items-center gap-1 text-sm font-medium text-primary hover:opacity-90"
              >
                {next.label}
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : null}
          </nav>
        </article>

        <aside className="hidden w-44 shrink-0 xl:block">
          <div className="sticky top-6">
            <KnowledgeToc items={doc.toc} />
          </div>
        </aside>
      </div>
    </div>
  );
}
