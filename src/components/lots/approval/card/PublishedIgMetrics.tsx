export type PublishedIgSnapshot = {
  permalink: string | null;
  lastSyncedAt: string | null;
  metrics: Record<string, number>;
};

export function PublishedIgMetrics({ ig }: { ig: PublishedIgSnapshot | null | undefined }) {
  if (!ig) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Sem métricas da publicação. Use Puxar publicações no dashboard Instagram.
      </div>
    );
  }
  const views = ig.metrics.views ?? ig.metrics.impressions;
  const interactions = ig.metrics.total_interactions;
  return (
    <div className="rounded-lg border border-border px-3 py-2 text-sm">
      <p className="font-medium">Métricas da publicação</p>
      <p className="text-muted-foreground">
        {views != null ? `${views} visualizações` : "Visualizações indisponíveis"}
        {interactions != null ? ` · ${interactions} interações` : ""}
      </p>
      {ig.permalink && (
        <a
          href={ig.permalink}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-primary underline"
        >
          Abrir no Instagram
        </a>
      )}
    </div>
  );
}
