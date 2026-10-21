export type ConnectionAlertInput = {
  status: string;
  healthStatus: string;
  lastSyncStatus: string | null;
};

const PLUGIN_ALERT_LABEL: Record<string, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  ga4: "GA4",
  instagram_organic: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  google_business: "Google Business",
};

/** Conexão ativa cuja última coleta falhou — o chip da visão geral usa isto. */
export function connectionHasFailedSync(row: ConnectionAlertInput): boolean {
  if (row.status !== "active") return false;
  if (row.healthStatus === "unhealthy") return true;
  return row.lastSyncStatus === "failed" || row.lastSyncStatus === "error";
}

export function pluginAlertLabel(pluginKey: string): string {
  return PLUGIN_ALERT_LABEL[pluginKey] ?? pluginKey;
}

export function clipAlertError(message: string | null | undefined, max = 80): string | null {
  const text = message?.trim();
  if (!text) return null;
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
