import { Link } from "@tanstack/react-router";
import { BarChart3, ClipboardCheck, LayoutDashboard, Plug } from "lucide-react";
import { LotsBIWordmark } from "@/components/lots/LotsMark";
import { PageHeader } from "@/components/lots/PageHeader";
import { dashboardBrandTheme, PlatformBrandMark } from "@/components/lots/PlatformBrandMark";
import { buttonVariants } from "@/components/ui/button";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import {
  DASHBOARD_CATALOG,
  DASHBOARD_FAMILY_META,
  type DashboardFamilyId,
} from "@/lib/dashboards-catalog";
import { cn } from "@/lib/utils";

const PILLARS = [
  {
    icon: LayoutDashboard,
    title: "Dados no mesmo lugar",
    body: "Mídia paga, redes sociais e o site da marca entram em dashboards com o mesmo recorte de período — sem pular de ferramenta em ferramenta.",
  },
  {
    icon: ClipboardCheck,
    title: "Social com fluxo claro",
    body: "Aprovações de conteúdo e diretrizes da marca ficam no portal. Quem precisa validar um post encontra o material e responde no contexto da conta.",
  },
  {
    icon: Plug,
    title: "Contas conectadas",
    body: "As plataformas oficiais alimentam as métricas. Quando uma conexão está ativa, o dashboard correspondente aparece para a sua marca.",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "A agência conecta as contas",
    body: "Meta, Google, Instagram, TikTok e as demais fontes entram pelas integrações da marca.",
  },
  {
    n: "02",
    title: "As métricas chegam nos dashboards",
    body: "Investimento, alcance, cliques e conversões aparecem por plataforma, com comparação ao período anterior.",
  },
  {
    n: "03",
    title: "Você acompanha e decide",
    body: "Lê o desempenho, aprova conteúdos e usa o mesmo portal para o que a operação da marca precisa no dia a dia.",
  },
] as const;

const FAMILIES: DashboardFamilyId[] = ["paid", "organic", "analytics"];

export function SobreLotsBIPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Sobre Lots BI"
        title={`O que é o ${BRAND_NAME}`}
        description={`${BRAND_TAGLINE}. Um portal para a marca ver desempenho de marketing digital com a mesma leitura que a agência usa no dia a dia.`}
      />

      <section className="lots-surface relative isolate overflow-hidden p-0">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(168,85,247,0.16),transparent_52%),radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.14),transparent_48%)]"
          aria-hidden
        />
        <div className="relative space-y-5 px-5 py-8 sm:px-8 sm:py-10">
          <LotsBIWordmark size="lg" />
          <div className="max-w-2xl space-y-3">
            <p className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {BRAND_TAGLINE}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              O {BRAND_NAME} reúne o que antes ficava espalhado: campanhas de anúncio, presença
              orgânica e tráfego do site. A ideia é simples — abrir o portal e entender como a
              marca está performando, com números que a agência já opera.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard" className={buttonVariants()}>
              Ver dashboards
            </Link>
            <Link to="/tutorial" className={buttonVariants({ variant: "outline" })}>
              Como usar
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <header className="space-y-1">
          <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">
            O que o portal faz
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Três frentes no mesmo acesso — dados, social e conexões.
          </p>
        </header>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PILLARS.map((pillar) => (
            <li key={pillar.title} className="lots-surface p-5">
              <span className="mb-4 grid h-10 w-10 place-items-center rounded-lg border border-border bg-muted">
                <pillar.icon className="h-5 w-5 text-foreground" aria-hidden />
              </span>
              <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
                {pillar.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-6">
        <header className="space-y-1">
          <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">
            Plataformas que o Lots BI lê
          </h2>
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Cada card é um dashboard real da plataforma. A sua marca só vê os que estão
            conectados — este mosaico mostra o recorte completo.
          </p>
        </header>
        {FAMILIES.map((family, index) => {
          const meta = DASHBOARD_FAMILY_META[family];
          const entries = DASHBOARD_CATALOG.filter((entry) => entry.family === family);
          return (
            <div
              key={family}
              className={cn("space-y-3", index > 0 && "border-t border-border pt-6")}
            >
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">
                  {meta.label}
                </h3>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {entries.map((entry) => {
                  const theme = dashboardBrandTheme(entry.id);
                  return (
                    <li key={entry.id}>
                      <article
                        className={cn(
                          "lots-surface relative isolate flex min-h-[8.25rem] flex-col overflow-hidden p-4 sm:p-5",
                          theme.card,
                        )}
                      >
                        <PlatformBrandMark
                          dashboardId={entry.id}
                          className={cn(
                            "pointer-events-none absolute -right-3 -bottom-4 h-28 w-28 opacity-[0.16]",
                            theme.watermark,
                          )}
                        />
                        <span
                          className={cn(
                            "relative z-[1] grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                            theme.markWrap,
                          )}
                          aria-hidden
                        >
                          <PlatformBrandMark
                            dashboardId={entry.id}
                            decorative={false}
                            className="h-7 w-7"
                          />
                        </span>
                        <h4
                          className={cn(
                            "relative z-[1] mt-auto font-display text-[17px] font-semibold tracking-tight",
                            theme.title,
                          )}
                        >
                          {entry.label}
                        </h4>
                        <p className={cn("relative z-[1] mt-1 text-xs leading-relaxed", theme.title, "opacity-80")}>
                          {entry.description}
                        </p>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="lots-surface overflow-hidden p-0">
        <header className="border-b border-border bg-muted/55 px-4 py-4 sm:px-5">
          <h2 className="font-display text-sm font-semibold tracking-tight text-foreground sm:text-[15px]">
            Como entra no dia a dia
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Três passos — da conta conectada à decisão.
          </p>
        </header>
        <ol className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {STEPS.map((step) => (
            <li key={step.n} className="space-y-2 px-5 py-5">
              <p className="font-mono text-[11px] font-medium tracking-wider text-primary-600 dark:text-primary-300">
                {step.n}
              </p>
              <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="lots-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-muted">
            <BarChart3 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
              Comece pelos números da marca
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Os dashboards mostram só as plataformas ativas. Se algo não aparecer, a agência
              confirma a conexão.
            </p>
          </div>
        </div>
        <Link to="/dashboard" className={cn(buttonVariants(), "shrink-0")}>
          Ir para Dashboards
        </Link>
      </section>
    </div>
  );
}
