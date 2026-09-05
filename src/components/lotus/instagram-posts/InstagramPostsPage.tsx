import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/lotus/PageHeader";
import { PeriodPicker } from "@/components/lotus/PeriodPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolvePeriod, type PeriodInput } from "@/lib/period";
import type { IgMediaRow } from "@/modules/instagram-posts/types";
import {
  listInstagramPostsFn,
  syncInstagramPostsFn,
} from "@/modules/instagram-posts/instagram-posts.server";
import { InstagramPostCard } from "./InstagramPostCard";
import {
  engagementRate,
  formatProductTypeLabel,
  metricLabel,
  pickDisplayMetrics,
} from "./format-metrics";

const PRODUCT_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "FEED", label: "Feed" },
  { value: "REELS", label: "Reels" },
  { value: "CAROUSEL", label: "Carrossel" },
  { value: "STORY", label: "Stories" },
] as const;

export function InstagramPostsPage({
  cadastroClienteId,
}: {
  cadastroClienteId: number;
  clienteNome: string;
}) {
  const queryClient = useQueryClient();
  const [periodInput, setPeriodInput] = useState<PeriodInput>({ preset: "last_30" });
  const [productFilter, setProductFilter] = useState("all");
  const [selected, setSelected] = useState<IgMediaRow | null>(null);
  const period = useMemo(() => resolvePeriod(periodInput), [periodInput]);

  const postsQuery = useQuery({
    queryKey: [
      "instagram-posts",
      cadastroClienteId,
      period.from,
      period.to,
      productFilter,
    ],
    queryFn: () =>
      listInstagramPostsFn({
        data: {
          cadastroClienteId,
          from: period.from,
          to: period.to,
          productType: productFilter === "all" ? undefined : productFilter,
        },
      }),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncInstagramPostsFn({ data: { cadastroClienteId } }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível puxar métricas");
        return;
      }
      toast.success(`${result.mediaCount ?? 0} publicações atualizadas`);
      queryClient.invalidateQueries({ queryKey: ["instagram-posts", cadastroClienteId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const posts = postsQuery.data?.posts ?? [];
  const avgEngagement =
    posts.length > 0
      ? posts.reduce((sum, post) => sum + (engagementRate(post.metrics) ?? 0), 0) / posts.length
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Instagram"
        title="Publicações"
        description="Dados coletados para o período selecionado"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker value={periodInput} onChange={setPeriodInput} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncMutation.isPending || !postsQuery.data?.hasConnection}
              onClick={() => syncMutation.mutate()}
            >
              <RefreshCw
                className={syncMutation.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                aria-hidden
              />
              Puxar métricas
            </Button>
          </div>
        }
      />

      {!postsQuery.data?.hasConnection && (
        <div className="lotus-surface p-4 text-sm text-muted-foreground">
          Instagram ainda não conectado para este cliente. Peça ao administrador conectar em
          Conexões.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Publicações" value={String(posts.length)} />
        <KpiCard
          label="Views (soma)"
          value={sumMetric(posts, "views").toLocaleString("pt-BR")}
        />
        <KpiCard
          label="Interações (soma)"
          value={sumMetric(posts, "total_interactions").toLocaleString("pt-BR")}
        />
        <KpiCard label="Engajamento médio" value={`${avgEngagement.toFixed(1)}%`} />
      </div>

      <div className="flex flex-wrap gap-2">
        {PRODUCT_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setProductFilter(filter.value)}
            className={
              productFilter === filter.value
                ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      {postsQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="lotus-skeleton aspect-[4/5] rounded-xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="lotus-surface p-6 text-sm text-muted-foreground">
          Nenhuma publicação no período. Amplie o filtro ou clique em Puxar métricas.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {posts.map((post) => (
            <InstagramPostCard key={post.id} post={post} onOpen={() => setSelected(post)} />
          ))}
        </div>
      )}

      <PostDetailDialog post={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="lotus-surface p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function sumMetric(posts: IgMediaRow[], key: string): number {
  return posts.reduce((sum, post) => {
    const value = post.metrics[key];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
}

function PostDetailDialog({
  post,
  onClose,
}: {
  post: IgMediaRow | null;
  onClose: () => void;
}) {
  if (!post) return null;

  const metrics = Object.entries(post.metrics).filter(
    ([, value]) => typeof value === "number",
  );
  const rate = engagementRate(post.metrics);

  return (
    <Dialog open={Boolean(post)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {formatProductTypeLabel(post.media_product_type)} ·{" "}
            {new Date(post.published_at).toLocaleString("pt-BR")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {post.caption && (
            <p className="text-sm text-muted-foreground line-clamp-6">{post.caption}</p>
          )}
          {rate != null && (
            <p className="text-sm font-medium">Engajamento: {rate.toFixed(1)}%</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {metrics.map(([key, value]) => (
              <div key={key} className="rounded-lg border border-border p-2">
                <p className="text-[10px] uppercase text-muted-foreground">{metricLabel(key)}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {Number(value).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
          {post.permalink && (
            <a
              href={post.permalink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Ver no Instagram <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {post.media_product_type === "STORY" && (
            <p className="text-xs text-muted-foreground">
              Stories expiram nas métricas após ~24h — dados podem não estar disponíveis depois
              desse período.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
