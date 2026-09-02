import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { BRAND_NAME } from "@/lib/brand";
import {
  BookOpen,
  Clock,
  Star,
  Sparkles,
  Database,
  Wrench,
  Smartphone,
  Plug,
} from "lucide-react";
import { kcDocsBySlugsQuery } from "@/lib/knowledge-center/registry";
import { getFavorites, getRecent } from "@/lib/knowledge-center/storage";

const HIGHLIGHTS = [
  {
    slug: "06-dashboards/instagram-posts",
    title: "Publicações Instagram",
    description: "Métricas por post, plugin instagram_organic e sync.",
    icon: Sparkles,
  },
  {
    slug: "13-platform-hub/readme",
    title: "Platform Hub (RC1)",
    description: "Hub de conexões — handoff, homologação e próximos passos.",
    icon: Plug,
  },
  {
    slug: "12-changelog/changelog",
    title: "Changelog",
    description: "Entregas recentes — produto, dados e infraestrutura.",
    icon: Sparkles,
  },
  {
    slug: "04-database/migrations",
    title: "Migrations",
    description: "Ordem oficial 01→33, idempotência e validação.",
    icon: Database,
  },
  {
    slug: "08-operations/troubleshooting",
    title: "Troubleshooting",
    description: "Diagnóstico: views, admin, build e erros comuns.",
    icon: Wrench,
  },
  {
    slug: "06-dashboards/knowledge-center",
    title: "Este módulo",
    description: "Arquitetura do KC, tutorial, novidades e manutenção.",
    icon: Smartphone,
  },
] as const;

export function KnowledgeHome() {
  return (
    <Suspense fallback={<div className="lotus-skeleton mx-auto h-64 max-w-3xl rounded-2xl" />}>
      <KnowledgeHomeBody />
    </Suspense>
  );
}

function KnowledgeHomeBody() {
  const favoriteSlugs = getFavorites();
  const recentSlugs = getRecent().filter((s) => s !== "start-here");
  const { data: favorites } = useSuspenseQuery(kcDocsBySlugsQuery(favoriteSlugs));
  const { data: recent } = useSuspenseQuery(kcDocsBySlugsQuery(recentSlugs));

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-2">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-secondary/5 p-6 sm:p-8">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-600 dark:text-primary-300">
          <BookOpen className="h-5 w-5" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Knowledge Center</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Handbook de engenharia e produto do {BRAND_NAME} — arquitetura, dados, dashboards e
          operações. A pasta <code className="rounded bg-muted px-1 py-0.5 text-xs">docs/</code> é a
          fonte única; novos arquivos aparecem aqui após o build.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          No celular, use o botão de menu no topo para abrir o índice lateral.
        </p>
        <Link
          to="/admin/knowledge/$"
          params={{ _splat: "start-here" }}
          className="lotus-focus mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Começar por START HERE
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Destaques recentes</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.slug}>
                <Link
                  to="/admin/knowledge/$"
                  params={{ _splat: item.slug }}
                  className="flex h-full gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-primary-600 dark:text-primary-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {favorites.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Star className="h-4 w-4 text-primary-500" />
            Favoritos
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {favorites.map((doc) => (
              <li key={doc.slug}>
                <Link
                  to="/admin/knowledge/$"
                  params={{ _splat: doc.slug }}
                  className="block rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary-300"
                >
                  <p className="text-sm font-medium">{doc.title}</p>
                  {doc.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {doc.description}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Acessados recentemente
          </h2>
          <ul className="space-y-1">
            {recent.map((doc) => (
              <li key={doc.slug}>
                <Link
                  to="/admin/knowledge/$"
                  params={{ _splat: doc.slug }}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <span className="min-w-0 truncate">{doc.title}</span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                    {doc.path}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
