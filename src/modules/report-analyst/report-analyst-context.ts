// Contexto do analista do relatório. Só lê OperationalReport e os bullets
// de buildInsights — não chama rede, não inventa número e não grava nota.

import { buildInsights, type Insight, type Totals } from "@/lib/metrics";
import { formatDeltaPct, formatReportValue } from "@/modules/operational-report/format";
import type { OperationalReport, ReportMetric } from "@/modules/operational-report/types";

export const REPORT_ANALYST_CAMPAIGN_CAP = 8;
export const REPORT_ANALYST_POST_CAP = 10;
export const REPORT_ANALYST_HISTORY_CAP = 8;
export const REPORT_ANALYST_DAILY_LIMIT = 30;
export const REPORT_ANALYST_STRING_CAP = 180;

const ZERO: Totals = {
  spend: 0,
  meta_spend: 0,
  google_spend: 0,
  impressions: 0,
  clicks: 0,
  sessions: 0,
  conversions: 0,
  reach: 0,
  engagement: 0,
};

export type ReportAnalystContext = {
  clienteNome: string;
  periodLabel: string;
  headline: string;
  moodLabel: string;
  insights: Insight[];
  prompt: string;
};

export function truncateAnalystText(value: string, max = REPORT_ANALYST_STRING_CAP): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1))}…`;
}

export function insightsForOperationalReport(report: OperationalReport): Insight[] {
  const { current, previous } = totalsFromOperationalReport(report);
  return buildInsights({ current, previous, days: report.period.days });
}

export function buildReportAnalystContext(
  report: OperationalReport,
  insights: Insight[] = insightsForOperationalReport(report),
): ReportAnalystContext {
  return {
    clienteNome: report.clienteNome,
    periodLabel: report.period.label,
    headline: report.reading.headline,
    moodLabel: report.reading.moodLabel,
    insights,
    prompt: renderPrompt(report, insights),
  };
}

export function renderReportAnalystSystem(context: ReportAnalystContext): string {
  return [
    "Você é o analista do relatório operacional da Lots.",
    "Responda em português do Brasil, em poucos parágrafos.",
    "Use somente o contexto. Se o dado não estiver nele, diga que o relatório não traz essa informação.",
    "Não invente causa, meta, orçamento nem número.",
    "Não diga que a análise foi enviada ou publicada.",
    "O histórico da conversa não substitui o contexto.",
    "",
    "Contexto:",
    context.prompt,
  ].join("\n");
}

export function plainTextToNoteHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function renderPrompt(report: OperationalReport, insights: Insight[]): string {
  const lines: string[] = [];
  lines.push(`Cliente: ${truncateAnalystText(report.clienteNome)}`);
  lines.push(
    `Período: ${report.period.label} (${report.period.from} a ${report.period.to}, ${report.period.days} dias).`,
  );
  lines.push(`Período anterior: ${report.period.prevFrom} a ${report.period.prevTo}.`);
  lines.push(`Leitura: ${truncateAnalystText(report.reading.headline)}`);
  lines.push(`Clima: ${report.reading.moodLabel}.`);

  if (report.heroes.length === 0) {
    lines.push("Heróis: nenhum.");
  } else {
    lines.push("Heróis:");
    for (const hero of report.heroes) lines.push(`- ${metricLine(hero)}`);
  }

  if (report.movers.length === 0) {
    lines.push("Movimentos: nenhum acima do limiar do relatório.");
  } else {
    lines.push("Movimentos:");
    for (const mover of report.movers) {
      lines.push(
        `- ${truncateAnalystText(mover.title)} (${truncateAnalystText(mover.detail)}): ${formatDeltaPct(mover.deltaPct)}, tom ${mover.tone}.`,
      );
    }
  }

  if (report.platforms.length === 0) {
    lines.push("Plataformas com coleta: nenhuma.");
  } else {
    lines.push("Plataformas:");
    for (const platform of report.platforms) {
      const metrics =
        platform.metrics.length > 0
          ? platform.metrics.map((metric) => metricLine(metric)).join("; ")
          : "sem métrica em destaque";
      lines.push(`- ${truncateAnalystText(platform.label)}: ${metrics}`);
    }
  }

  const campaigns = report.platforms
    .flatMap((platform) =>
      platform.campaigns.map((campaign) => ({
        platform: platform.label,
        name: campaign.name,
        spend: campaign.spend,
        results: campaign.results,
        clicks: campaign.clicks,
      })),
    )
    .sort((a, b) => b.spend - a.spend)
    .slice(0, REPORT_ANALYST_CAMPAIGN_CAP);

  if (campaigns.length === 0) {
    lines.push("Campanhas: nenhuma no recorte.");
  } else {
    lines.push(`Campanhas (até ${REPORT_ANALYST_CAMPAIGN_CAP}, maior investimento primeiro):`);
    for (const campaign of campaigns) {
      const results =
        campaign.results != null
          ? `, ${formatReportValue("int", campaign.results)} resultados`
          : "";
      const clicks =
        campaign.clicks != null ? `, ${formatReportValue("int", campaign.clicks)} cliques` : "";
      lines.push(
        `- ${truncateAnalystText(campaign.platform)} / ${truncateAnalystText(campaign.name)}: ${formatReportValue("currency", campaign.spend)}${results}${clicks}`,
      );
    }
  }

  if (!report.posts) {
    lines.push("Publicações: nenhuma no recorte.");
  } else {
    lines.push(
      `Publicações: ${report.posts.count} (antes ${report.posts.previousCount}); views ${formatReportValue("int", report.posts.views)} (antes ${formatReportValue("int", report.posts.previousViews)}); interações ${formatReportValue("int", report.posts.interactions)} (antes ${formatReportValue("int", report.posts.previousInteractions)}).`,
    );
    const highlights = report.posts.highlights.slice(0, REPORT_ANALYST_POST_CAP);
    if (highlights.length > 0) {
      lines.push("Destaques de publicação:");
      for (const post of highlights) {
        const title = truncateAnalystText(post.title ?? post.productType);
        const views =
          post.views != null ? `${formatReportValue("int", post.views)} views` : "views —";
        const interactions =
          post.interactions != null
            ? `${formatReportValue("int", post.interactions)} interações`
            : "interações —";
        lines.push(`- ${post.publishedAt.slice(0, 10)} ${title}: ${views}, ${interactions}`);
      }
    }
  }

  if (!report.content) {
    lines.push("Conteúdos no calendário: nenhum.");
  } else {
    lines.push(
      `Conteúdos: ${report.content.planned} no calendário (antes ${report.content.previousPlanned}); ${report.content.published} publicados (antes ${report.content.previousPublished}).`,
    );
    if (report.content.byStatus.length > 0) {
      lines.push(
        `Status: ${report.content.byStatus
          .slice(0, 8)
          .map((row) => `${truncateAnalystText(row.label, 40)} ${row.count}`)
          .join(", ")}.`,
      );
    }
    if (report.content.byFormato.length > 0) {
      lines.push(
        `Formatos: ${report.content.byFormato
          .slice(0, 8)
          .map((row) => `${truncateAnalystText(row.formato, 40)} ${row.count}`)
          .join(", ")}.`,
      );
    }
  }

  if (report.mix.length > 0) {
    lines.push(
      `Mix de investimento: ${report.mix
        .map(
          (slice) =>
            `${truncateAnalystText(slice.label, 40)} ${formatReportValue(slice.format, slice.value)}`,
        )
        .join(", ")}.`,
    );
  }

  if (report.coverage.withData.length > 0) {
    lines.push(
      `Cobertura: ${report.coverage.withData.map((name) => truncateAnalystText(name, 40)).join(", ")}.`,
    );
  }
  for (const note of report.coverage.notes.slice(0, 4)) {
    lines.push(`Nota de cobertura: ${truncateAnalystText(note)}`);
  }

  if (insights.length === 0) {
    lines.push("Sinais automáticos: nenhum.");
  } else {
    lines.push("Sinais automáticos:");
    for (const insight of insights) {
      lines.push(
        `- ${truncateAnalystText(insight.title)} — ${truncateAnalystText(insight.detail)} (tom ${insight.tone}).`,
      );
    }
  }

  return lines.join("\n");
}

function metricLine(metric: ReportMetric): string {
  return `${truncateAnalystText(metric.label, 60)} ${formatReportValue(metric.format, metric.value)} (antes ${formatReportValue(metric.format, metric.previous)}, ${formatDeltaPct(metric.deltaPct)})`;
}

function totalsFromOperationalReport(report: OperationalReport): {
  current: Totals;
  previous: Totals;
} {
  const hero = (key: string) => report.heroes.find((item) => item.key === key);
  const metric = (platform: string, key: string) =>
    report.platforms
      .find((item) => item.key === platform)
      ?.metrics.find((item) => item.key === key);
  const metaSpend = pair(metric("meta_ads", "spend"));
  const googleSpend = pair(metric("google_ads", "spend"));
  const spend = hero("hero_spend") ? pair(hero("hero_spend")) : add(metaSpend, googleSpend);
  const conversions = hero("hero_results")
    ? pair(hero("hero_results"))
    : add(
        add(pair(metric("meta_ads", "results")), pair(metric("google_ads", "conversions"))),
        pair(metric("ga4", "conversions")),
      );
  const sessions = hero("hero_sessions")
    ? pair(hero("hero_sessions"))
    : pair(metric("ga4", "sessions"));
  const reach = hero("hero_ig_reach")
    ? pair(hero("hero_ig_reach"))
    : pair(metric("instagram", "reach"));
  const engagementMetric = metric("instagram", "interactions");
  const engagement = engagementMetric
    ? pair(engagementMetric)
    : {
        value: report.posts?.interactions ?? 0,
        previous: report.posts?.previousInteractions ?? 0,
      };
  const impressions = sumMetric(report, "impressions");
  const clicks = sumMetric(report, "clicks");

  return {
    current: {
      ...ZERO,
      spend: spend.value,
      meta_spend: metaSpend.value,
      google_spend: googleSpend.value,
      impressions: impressions.value,
      clicks: clicks.value,
      sessions: sessions.value,
      conversions: conversions.value,
      reach: reach.value,
      engagement: engagement.value,
    },
    previous: {
      ...ZERO,
      spend: spend.previous,
      meta_spend: metaSpend.previous,
      google_spend: googleSpend.previous,
      impressions: impressions.previous,
      clicks: clicks.previous,
      sessions: sessions.previous,
      conversions: conversions.previous,
      reach: reach.previous,
      engagement: engagement.previous,
    },
  };
}

function pair(metric: ReportMetric | undefined): { value: number; previous: number } {
  return { value: metric?.value ?? 0, previous: metric?.previous ?? 0 };
}

function add(
  left: { value: number; previous: number },
  right: { value: number; previous: number },
): { value: number; previous: number } {
  return { value: left.value + right.value, previous: left.previous + right.previous };
}

function sumMetric(report: OperationalReport, key: string): { value: number; previous: number } {
  return report.platforms.reduce(
    (acc, platform) => {
      const metric = platform.metrics.find((item) => item.key === key);
      if (!metric) return acc;
      return { value: acc.value + metric.value, previous: acc.previous + metric.previous };
    },
    { value: 0, previous: 0 },
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
