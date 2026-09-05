import { Megaphone, BarChart3, Share2, Play, MapPin, Plug } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS = {
  ads: Megaphone,
  analytics: BarChart3,
  social: Share2,
  video: Play,
  local: MapPin,
} as const;

const PLATFORM_LOGOS: Record<string, { label: string; color: string }> = {
  meta_ads: { label: "Meta", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  google_ads: { label: "Google", color: "bg-red-500/15 text-red-600 dark:text-red-400" },
  ga4: { label: "GA4", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  tiktok_ads: { label: "TikTok", color: "bg-foreground/10 text-foreground" },
  linkedin_ads: { label: "LinkedIn", color: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  instagram_organic: { label: "Instagram", color: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
  google_business: {
    label: "GMB",
    color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
};

export function PlatformLogoBadge({ pluginKey }: { pluginKey: string }) {
  const meta = PLATFORM_LOGOS[pluginKey] ?? {
    label: pluginKey.slice(0, 2).toUpperCase(),
    color: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold",
        meta.color,
      )}
      aria-hidden
    >
      {meta.label}
    </span>
  );
}

export function PlatformCategoryIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] ?? Plug;
  return <Icon className={cn("h-5 w-5", className)} aria-hidden />;
}

export function HubHealthBadge({ status, score }: { status: string; score?: number | null }) {
  const styles: Record<string, string> = {
    healthy: "bg-success/15 text-success border-success/30",
    degraded: "bg-warning/15 text-warning border-warning/30",
    unhealthy: "bg-danger/15 text-danger border-danger/30",
    unknown: "bg-muted text-muted-foreground border-border",
  };
  const labels: Record<string, string> = {
    healthy: "Saudável",
    degraded: "Degradada",
    unhealthy: "Com erro",
    unknown: "Desconhecido",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status] ?? styles.unknown,
      )}
    >
      {labels[status] ?? status}
      {score != null && <span className="ml-1 opacity-70">({score})</span>}
    </span>
  );
}

export function HubProviderBadge({ provider }: { provider: string }) {
  const label = provider === "official_api" ? "Official API" : "Make Passive";
  const style =
    provider === "official_api"
      ? "bg-primary/10 text-primary border-primary/20"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium", style)}
    >
      {label}
    </span>
  );
}
