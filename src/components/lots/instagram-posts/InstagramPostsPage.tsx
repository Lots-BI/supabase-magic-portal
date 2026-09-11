import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/lots/PageHeader";
import { PeriodPicker } from "@/components/lots/PeriodPicker";
import { Button } from "@/components/ui/button";
import { resolvePeriod, formatBR, type PeriodInput } from "@/lib/period";
import { pctDelta } from "@/lib/platforms/engine";
import type { IgMediaRow } from "@/modules/instagram-posts/types";
import {
  listInstagramPostsFn,
  syncInstagramPostsFn,
} from "@/modules/instagram-posts/instagram-posts.server";
import { InstagramPostCard } from "./InstagramPostCard";
import { InstagramPostReport } from "./InstagramPostReport";
import { StatCard } from "@/components/lots/StatCard";
import {
  engagementRate,
  POSTS_KPI_KEYS,
  POSTS_KPI_LABELS,
  summarizePosts,
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
  clienteSlug,
  isAdmin,
  openMediaId,
}: {
  cadastroClienteId: number;
  clienteNome: string;
  clienteSlug?: string;
  isAdmin?: boolean;
  openMediaId?: string;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
      openMediaId ?? null,
    ],
    queryFn: () =>
      listInstagramPostsFn({
        data: {
          cadastroClienteId,
          from: period.from,
          to: period.to,
          productType: productFilter === "all" ? undefined : productFilter,
          includeMediaId: openMediaId,
        },
      }),
  });

  const previousQuery = useQuery({
    queryKey: [
      "instagram-posts",
      cadastroClienteId,
      period.prevFrom,
      period.prevTo,
      productFilter,
    ],
    queryFn: () =>
      listInstagramPostsFn({
        data: {
          cadastroClienteId,
          from: period.prevFrom,
          to: period.prevTo,
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
      toast.success(
        (result.mediaCount ?? 0) === 0
          ? "Nenhuma publicação na conta — conexão ok"
          : `${result.mediaCount} publicações atualizadas`,
      );
      queryClient.invalidateQueries({ queryKey: ["instagram-posts", cadastroClienteId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const rawPosts = postsQuery.data?.posts;
  const posts = useMemo(
    () => (rawPosts ?? []).map((post) => ({ ...post, cliente_slug: post.cliente_slug ?? clienteSlug })),
    [rawPosts, clienteSlug],
  );
  const currentTotals = useMemo(() => summarizePosts(posts), [posts]);
  const previousTotals = useMemo(
    () => summarizePosts(previousQuery.data?.posts ?? []),
    [previousQuery.data?.posts],
  );
  const avgEngagement =
    posts.length > 0
      ? posts.reduce((sum, post) => sum + (engagementRate(post.metrics) ?? 0), 0) / posts.length
      : 0;

  useEffect(() => {
    if (!openMediaId || posts.length === 0) return;
    const match = posts.find((post) => post.id === openMediaId);
    if (match) setSelected(match);
  }, [openMediaId, posts]);

  function closeReport() {
    setSelected(null);
    if (openMediaId && clienteSlug) {
      void navigate({
        to: "/cliente/$cliente/publicacoes",
        params: { cliente: clienteSlug },
        search: {},
        replace: true,
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Instagram"
        title="Publicações"
        description={
          postsQuery.data?.lastSyncedAt
            ? `Última sincronização: ${new Date(postsQuery.data.lastSyncedAt).toLocaleString("pt-BR")}`
            : "Dados coletados para o período selecionado"
        }
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
        <div className="lots-surface p-4 text-sm text-muted-foreground">
          Instagram ainda não conectado para este cliente. Peça ao administrador conectar em
          Conexões.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {POSTS_KPI_KEYS.map((key) => (
          <StatCard
            key={key}
            label={POSTS_KPI_LABELS[key]}
            value={currentTotals[key]}
            delta={
              previousQuery.isFetched
                ? pctDelta(currentTotals[key], previousTotals[key])
                : null
            }
            description={`Vs ${formatBR(period.prevFrom)} – ${formatBR(period.prevTo)}`}
            emphasis="compact"
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Cards: variação vs o período anterior do mesmo tamanho. Alcance somado entre publicações
        pode contar a mesma pessoa mais de uma vez. Engajamento médio: {avgEngagement.toFixed(1)}%.
      </p>

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
            <div key={i} className="lots-skeleton aspect-[4/5] rounded-xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="lots-surface p-6 text-sm text-muted-foreground">
          Nenhuma publicação no período. Amplie o filtro ou clique em Puxar métricas.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {posts.map((post) => (
            <InstagramPostCard key={post.id} post={post} onOpen={() => setSelected(post)} />
          ))}
        </div>
      )}

      <InstagramPostReport
        post={selected}
        posts={posts}
        isAdmin={isAdmin}
        onClose={closeReport}
      />
    </div>
  );
}
