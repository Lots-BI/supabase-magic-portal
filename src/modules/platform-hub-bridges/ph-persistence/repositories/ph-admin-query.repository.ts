import type { SupabaseClient } from "@supabase/supabase-js";

export interface PhConnectionAdminRowV1 {
  id: string;
  pluginKey: string;
  label: string;
  scopeRef: string;
  cadastroId: number | null;
  clienteNome: string | null;
  capability: string;
  activeProviderType: string;
  status: string;
  migrationStage: string;
  healthStatus: string;
  healthScore: number | null;
  apiVersion: string | null;
  coverage: number | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
  metricsCount: number;
  identityCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface HubIngestPlatformLagV1 {
  plataforma: string;
  maxDate: string | null;
  lagging: boolean;
}

export interface PhConnectionsOverviewV1 {
  total: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  unknown: number;
  makePassive: number;
  officialApi: number;
  withError: number;
  ingestLag: HubIngestPlatformLagV1[];
  ingestLagging: boolean;
}

export class PhAdminQueryRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listConnections(filters?: {
    search?: string;
    pluginKey?: string;
    health?: string;
    provider?: string;
    cadastroId?: number;
  }): Promise<PhConnectionAdminRowV1[]> {
    let query = this.supabase
      .from("ph_connections")
      .select(
        `
        id,plugin_key,label,scope_ref,cadastro_id,capability,active_provider_type,status,
        migration_stage,health_status,health_score,api_version,coverage,
        last_sync_at,last_sync_status,last_error,metrics_count,created_at,updated_at,
        cadastro_clientes(nome_cliente),
        ph_identities(count)
      `,
      )
      .order("updated_at", { ascending: false });

    if (filters?.pluginKey) query = query.eq("plugin_key", filters.pluginKey);
    if (filters?.health) query = query.eq("health_status", filters.health);
    if (filters?.provider) query = query.eq("active_provider_type", filters.provider);
    if (filters?.cadastroId) query = query.eq("cadastro_id", filters.cadastroId);

    const { data, error } = await query;
    if (error) throw new Error(`ph_connections admin list failed: ${error.message}`);

    let rows = (data ?? []).map((row) => this.mapRow(row));

    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          (r.clienteNome?.toLowerCase().includes(q) ?? false) ||
          r.pluginKey.toLowerCase().includes(q),
      );
    }

    return rows;
  }

  async getConnection(id: string): Promise<PhConnectionAdminRowV1 | null> {
    const rows = await this.listConnections();
    return rows.find((r) => r.id === id) ?? null;
  }

  async getOverview(): Promise<PhConnectionsOverviewV1> {
    const { data, error } = await this.supabase
      .from("ph_connections")
      .select("health_status,active_provider_type,last_error,status,plugin_key");
    if (error) throw new Error(`ph_connections overview failed: ${error.message}`);

    const rows = data ?? [];
    const ingestLag = await this.listIngestLag(
      rows
        .filter((r) => r.status === "active" && r.active_provider_type === "official_api")
        .map((r) => String(r.plugin_key)),
    );
    return {
      total: rows.length,
      healthy: rows.filter((r) => r.health_status === "healthy").length,
      degraded: rows.filter((r) => r.health_status === "degraded").length,
      unhealthy: rows.filter((r) => r.health_status === "unhealthy").length,
      unknown: rows.filter((r) => r.health_status === "unknown").length,
      makePassive: rows.filter((r) => r.active_provider_type === "make_passive").length,
      officialApi: rows.filter((r) => r.active_provider_type === "official_api").length,
      withError: rows.filter((r) => r.last_error).length,
      ingestLag,
      ingestLagging: ingestLag.some((row) => row.lagging),
    };
  }

  private async listIngestLag(pluginKeys: string[]): Promise<HubIngestPlatformLagV1[]> {
    const { addDaysToDateStr, todayInSaoPaulo } = await import(
      "@/modules/platform-hub/plugins/instagram_organic/api/date-utils"
    );
    const cutoff = addDaysToDateStr(todayInSaoPaulo(), -2);
    const wanted = new Set(pluginKeys);
    const catalog: Array<{ pluginKey: string; label: string; match: string }> = [
      { pluginKey: "meta_ads", label: "Meta Ads", match: "meta ads" },
      { pluginKey: "instagram_organic", label: "Instagram", match: "instagram" },
    ];
    const out: HubIngestPlatformLagV1[] = [];
    for (const item of catalog) {
      if (!wanted.has(item.pluginKey)) continue;
      const { data, error } = await this.supabase
        .from("base_metricas_hub")
        .select("data")
        .ilike("plataforma", item.match)
        .order("data", { ascending: false })
        .limit(1);
      if (error) throw new Error(`hub ingest lag failed: ${error.message}`);
      const maxDate = data?.[0]?.data != null ? String(data[0].data) : null;
      out.push({
        plataforma: item.label,
        maxDate,
        lagging: !maxDate || maxDate < cutoff,
      });
    }
    return out;
  }

  async updateAdminFields(
    id: string,
    patch: Partial<{
      label: string;
      status: string;
      migrationStage: string;
      healthStatus: string;
      healthScore: number;
      apiVersion: string;
      coverage: number;
      lastSyncAt: string;
      lastSyncStatus: string;
      lastError: string | null;
      metricsCount: number;
    }>,
  ): Promise<void> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.label) updates.label = patch.label;
    if (patch.status) updates.status = patch.status;
    if (patch.migrationStage) updates.migration_stage = patch.migrationStage;
    if (patch.healthStatus) updates.health_status = patch.healthStatus;
    if (patch.healthScore !== undefined) updates.health_score = patch.healthScore;
    if (patch.apiVersion) updates.api_version = patch.apiVersion;
    if (patch.coverage !== undefined) updates.coverage = patch.coverage;
    if (patch.lastSyncAt) updates.last_sync_at = patch.lastSyncAt;
    if (patch.lastSyncStatus) updates.last_sync_status = patch.lastSyncStatus;
    if (patch.lastError !== undefined) updates.last_error = patch.lastError;
    if (patch.metricsCount !== undefined) updates.metrics_count = patch.metricsCount;
    const { error } = await this.supabase.from("ph_connections").update(updates).eq("id", id);
    if (error) throw new Error(`ph_connections admin update failed: ${error.message}`);
  }

  async listCredentialKeys(
    connectionId: string,
  ): Promise<Array<{ credentialKey: string; updatedAt: string }>> {
    const { data, error } = await this.supabase
      .from("ph_credentials")
      .select("credential_key,updated_at")
      .eq("connection_id", connectionId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(`ph_credentials list failed: ${error.message}`);
    return (data ?? []).map((r) => ({
      credentialKey: r.credential_key as string,
      updatedAt: r.updated_at as string,
    }));
  }

  async getAgencyAlerts(): Promise<{
    unhealthy: PhConnectionAdminRowV1[];
    degraded: PhConnectionAdminRowV1[];
    disconnected: PhConnectionAdminRowV1[];
    lowCoverage: PhConnectionAdminRowV1[];
    staleSync: PhConnectionAdminRowV1[];
  }> {
    const connections = await this.listConnections();
    const now = Date.now();
    const staleMs = 48 * 60 * 60 * 1000;
    return {
      unhealthy: connections.filter((c) => c.healthStatus === "unhealthy"),
      degraded: connections.filter((c) => c.healthStatus === "degraded"),
      disconnected: connections.filter((c) => c.status === "disabled"),
      lowCoverage: connections.filter((c) => c.coverage !== null && c.coverage < 0.5),
      staleSync: connections.filter(
        (c) =>
          c.status === "active" &&
          (!c.lastSyncAt || now - new Date(c.lastSyncAt).getTime() > staleMs),
      ),
    };
  }

  private mapRow(row: Record<string, unknown>): PhConnectionAdminRowV1 {
    const cliente = row.cadastro_clientes as { nome_cliente?: string } | null;
    const identities = row.ph_identities as Array<{ count?: number }> | null;
    return {
      id: row.id as string,
      pluginKey: row.plugin_key as string,
      label: row.label as string,
      scopeRef: row.scope_ref as string,
      cadastroId: row.cadastro_id as number | null,
      clienteNome: cliente?.nome_cliente ?? null,
      capability: row.capability as string,
      activeProviderType: row.active_provider_type as string,
      status: row.status as string,
      migrationStage: row.migration_stage as string,
      healthStatus: row.health_status as string,
      healthScore: row.health_score as number | null,
      apiVersion: row.api_version as string | null,
      coverage: row.coverage as number | null,
      lastSyncAt: row.last_sync_at as string | null,
      lastSyncStatus: row.last_sync_status as string | null,
      lastError: row.last_error as string | null,
      metricsCount: row.metrics_count as number,
      identityCount: identities?.[0]?.count ?? 0,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
