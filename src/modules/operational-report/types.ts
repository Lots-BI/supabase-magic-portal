import type { Period } from "@/lib/period";
import type { ValueFormat } from "@/lib/platforms/types";

export type ReportTone = "positive" | "negative" | "neutral";
export type ReportMood = "up" | "down" | "steady";

export type ReportMetric = {
  key: string;
  label: string;
  value: number;
  previous: number;
  deltaPct: number | null;
  format: ValueFormat;
  positiveIsGood: boolean;
  description?: string;
  kind: "metric" | "kpi";
};

export type ReportCallout = {
  id: string;
  tone: ReportTone;
  title: string;
  detail: string;
  deltaPct: number;
};

export type ReportCampaign = {
  name: string;
  spend: number;
  results: number | null;
  clicks: number | null;
};

export type ReportPlatformSection = {
  key: string;
  label: string;
  family: "paid" | "organic" | "analytics";
  description: string;
  href: string;
  hasData: true;
  lastDay: string | null;
  metrics: ReportMetric[];
  campaigns: ReportCampaign[];
  daily: Array<Record<string, number | string>>;
  dailyMetricKey: string | null;
};

export type ReportPostHighlight = {
  id: string;
  publishedAt: string;
  productType: string;
  title: string | null;
  views: number | null;
  interactions: number | null;
  permalink: string | null;
};

export type ReportPostsSection = {
  count: number;
  previousCount: number;
  views: number;
  previousViews: number;
  interactions: number;
  previousInteractions: number;
  highlights: ReportPostHighlight[];
};

export type ReportContentSection = {
  planned: number;
  previousPlanned: number;
  published: number;
  previousPublished: number;
  byStatus: Array<{ status: string; label: string; count: number }>;
  byFormato: Array<{ formato: string; count: number }>;
};

export type ReportPulse = {
  key: string;
  label: string;
  format: ValueFormat;
  daily: Array<{ date: string; value: number }>;
};

export type ReportMixSlice = {
  key: string;
  label: string;
  value: number;
  format: ValueFormat;
};

export type OperationalReport = {
  clienteNome: string;
  cadastroClienteId: number;
  clienteSlug: string;
  period: Pick<Period, "from" | "to" | "prevFrom" | "prevTo" | "label" | "days">;
  reading: {
    headline: string;
    mood: ReportMood;
    moodLabel: string;
  };
  heroes: ReportMetric[];
  movers: ReportCallout[];
  pulse: ReportPulse | null;
  mix: ReportMixSlice[];
  platforms: ReportPlatformSection[];
  posts: ReportPostsSection | null;
  content: ReportContentSection | null;
  coverage: {
    withData: string[];
    withoutData: string[];
    notes: string[];
  };
};
