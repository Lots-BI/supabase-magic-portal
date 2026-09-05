import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { GraduationCap, ArrowRight } from "lucide-react";
import { tutorialBasePath, tutorialNavQuery, type TutorialAudience } from "@/lib/platform-tutorial";
import { BRAND_NAME } from "@/lib/brand";

export function TutorialHome({ audience }: { audience: TutorialAudience }) {
  const { data: nav } = useSuspenseQuery(tutorialNavQuery(audience));
  const base = tutorialBasePath(audience);
  const first = nav[0];

  return (
    <div className="space-y-8 py-2">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-secondary/5 p-6 sm:p-8">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-600 dark:text-primary-300">
          <GraduationCap className="h-5 w-5" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Tutorial da plataforma</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {audience === "admin"
            ? `Guia completo para administradores do ${BRAND_NAME}: cada aba, cada campo, integrações e fluxos operacionais explicados passo a passo.`
            : `Guia completo para clientes do ${BRAND_NAME}: como ler métricas, aprovar conteúdo, acompanhar estratégia e navegar no seu painel.`}
        </p>
        {first?.slug && (
          <Link
            to={`${base}/$`}
            params={{ _splat: first.slug.replace(/^admin\/|^client\//, "") }}
            className="lots-focus mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Começar pelo primeiro capítulo
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Todos os capítulos</h2>
        <ol className="space-y-2">
          {nav.map((node, idx) => {
            if (!node.slug) return null;
            const splat = node.slug.replace(/^admin\/|^client\//, "");
            return (
              <li key={node.id}>
                <Link
                  to={`${base}/$`}
                  params={{ _splat: splat }}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30"
                >
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-bold tabular-nums text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{node.label}</p>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
