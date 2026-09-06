import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentCardStatus } from "../types/content-card";

const TABLE = "content_cards";
const EVENTS_TABLE = "content_card_events";

export type DashboardScope = {
  cadastroClienteId?: number;
};

export type DashboardStatusCount = {
  status: ContentCardStatus;
  count: number;
};

export type DashboardClientCount = {
  cadastro_cliente_id: number;
  cliente_nome: string;
  count: number;
};

export type DashboardResponsavelCount = {
  responsavel_email: string;
  count: number;
};

function scopeQuery(supabase: SupabaseClient, scope?: DashboardScope, columns = "*") {
  let q = supabase.from(TABLE).select(columns);
  if (scope?.cadastroClienteId != null) {
    q = q.eq("cadastro_cliente_id", scope.cadastroClienteId);
  }
  return q;
}

export const dashboardRepository = {
  async countByStatus(
    supabase: SupabaseClient,
    scope?: DashboardScope,
  ): Promise<DashboardStatusCount[]> {
    const { data, error } = await scopeQuery(supabase, scope, "status");
    if (error) throw new Error(error.message);

    const counts = new Map<ContentCardStatus, number>();
    for (const row of data ?? []) {
      const status = row.status as ContentCardStatus;
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  },

  async countByClient(
    supabase: SupabaseClient,
    scope?: DashboardScope,
  ): Promise<DashboardClientCount[]> {
    const { data, error } = await scopeQuery(supabase, scope, "cadastro_cliente_id, cliente_nome");
    if (error) throw new Error(error.message);

    const map = new Map<number, DashboardClientCount>();
    for (const row of data ?? []) {
      const id = Number(row.cadastro_cliente_id);
      const existing = map.get(id);
      if (existing) existing.count += 1;
      else
        map.set(id, {
          cadastro_cliente_id: id,
          cliente_nome: String(row.cliente_nome),
          count: 1,
        });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  },

  async countByResponsavel(
    supabase: SupabaseClient,
    scope?: DashboardScope,
  ): Promise<DashboardResponsavelCount[]> {
    const { data, error } = await scopeQuery(supabase, scope, "responsavel_email");
    if (error) throw new Error(error.message);

    const map = new Map<string, number>();
    for (const row of data ?? []) {
      const email = String(row.responsavel_email ?? "—");
      map.set(email, (map.get(email) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([responsavel_email, count]) => ({ responsavel_email, count }))
      .sort((a, b) => b.count - a.count);
  },

  async countOverdue(supabase: SupabaseClient, scope?: DashboardScope): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    let q = supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .lt("data_publicacao", today)
      .in("status", [
        "roteiro",
        "aguardando_aprovacao",
        "aguardando_material",
        "producao",
        "aguardando_aprovacao_final",
        "agendado",
      ]);
    if (scope?.cadastroClienteId != null) {
      q = q.eq("cadastro_cliente_id", scope.cadastroClienteId);
    }
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async countPublishedThisWeek(supabase: SupabaseClient, scope?: DashboardScope): Promise<number> {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);

    let q = supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("status", "publicado")
      .gte("published_at", monday.toISOString());
    if (scope?.cadastroClienteId != null) {
      q = q.eq("cadastro_cliente_id", scope.cadastroClienteId);
    }
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async listCardIdsForMetrics(
    supabase: SupabaseClient,
    scope?: DashboardScope,
    limit = 500,
  ): Promise<string[]> {
    const { data, error } = await scopeQuery(supabase, scope, "id")
      .neq("status", "arquivado")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => String(r.id));
  },

  async listEventsForCardIds(supabase: SupabaseClient, cardIds: string[]) {
    if (cardIds.length === 0) return [];
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select("*")
      .in("card_id", cardIds)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getSummary(supabase: SupabaseClient, cadastroClienteId: number) {
    const byStatus = await dashboardRepository.countByStatus(supabase, { cadastroClienteId });
    const total = byStatus.reduce((sum, row) => sum + row.count, 0);
    const awaitingApproval =
      byStatus.find((row) => row.status === "aguardando_aprovacao")?.count ?? 0;

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const { count, error } = await supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("cadastro_cliente_id", cadastroClienteId)
      .eq("status", "publicado")
      .gte("published_at", monthStart);
    if (error) throw new Error(error.message);

    return {
      total,
      byStatus,
      awaitingApproval,
      publishedThisMonth: count ?? 0,
    };
  },
};

export type DashboardRepository = typeof dashboardRepository;
