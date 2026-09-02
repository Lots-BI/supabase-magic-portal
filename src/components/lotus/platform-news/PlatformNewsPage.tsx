import { Sparkles, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/lotus/PageHeader";
import { listPlatformReleases } from "@/lib/platform-news";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

function formatReleaseDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

export function PlatformNewsPage({ audience }: { audience: "client" | "admin" }) {
  const releases = listPlatformReleases(audience);

  return (
    <div className="mx-auto max-w-2xl space-y-7 pb-10">
      <PageHeader
        eyebrow="Plataforma"
        title="Novidades"
        description={
          audience === "client"
            ? `O que mudou recentemente no ${BRAND_NAME} — novas telas, métricas e melhorias para acompanhar sua marca.`
            : `Entregas recentes no ${BRAND_NAME} — visão para operação e engenharia.`
        }
      />

      {releases.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma novidade publicada ainda.</p>
      ) : (
        <ol className="space-y-4">
          {releases.map((item, index) => (
            <li
              key={item.id}
              className={cn(
                "relative rounded-2xl border border-border bg-card p-5 sm:p-6",
                index === 0 && "border-primary/25 bg-gradient-to-br from-primary/5 via-card to-card",
              )}
            >
              {index === 0 && (
                <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200">
                  <Sparkles className="h-3 w-3" />
                  Mais recente
                </span>
              )}
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                <time dateTime={item.date}>{formatReleaseDate(item.date)}</time>
                {item.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-muted px-2 py-0.5 text-[10.5px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="font-display text-lg font-semibold tracking-tight">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
              {item.bullets && item.bullets.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                  {item.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-muted-foreground">
        Esta página é atualizada após cada entrega relevante. Dúvidas sobre uma novidade? Fale com
        sua equipe Lots ou consulte o{" "}
        {audience === "client" ? "Tutorial" : "Knowledge Center"} no menu lateral.
      </p>
    </div>
  );
}
