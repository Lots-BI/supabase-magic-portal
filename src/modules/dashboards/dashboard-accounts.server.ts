import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mergeDashboardPlatforms } from "@/lib/dashboard-accounts";
import { slugify } from "@/lib/slug";

export type DashboardAccountRow = {
  name: string;
  slug: string;
  platforms: string[];
  lastData: string | null;
};

function pluginsByCadastro(
  connections: { cadastro_id: number | null; plugin_key: string }[],
): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const row of connections) {
    if (row.cadastro_id == null) continue;
    const list = map.get(row.cadastro_id) ?? [];
    list.push(row.plugin_key);
    map.set(row.cadastro_id, list);
  }
  return map;
}

export const listDashboardAccountsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardAccountRow[]> => {
    const { data: ativos, error: ativosError } = await context.supabase.rpc(
      "portfolio_clientes_ativos",
    );
    if (ativosError) throw new Error(ativosError.message);

    const { data: cadastros, error: cadError } = await context.supabase
      .from("cadastro_clientes")
      .select("id, nome_cliente, slug");
    if (cadError) throw new Error(cadError.message);

    const cadastroIds = (cadastros ?? []).map((row) => row.id);
    let connections: { cadastro_id: number | null; plugin_key: string }[] = [];
    if (cadastroIds.length > 0) {
      const { data, error } = await getSupabaseAdmin()
        .from("ph_connections")
        .select("cadastro_id, plugin_key")
        .eq("status", "active")
        .in("cadastro_id", cadastroIds);
      if (error) throw new Error(error.message);
      connections = data ?? [];
    }

    const hubByCadastro = pluginsByCadastro(connections);
    const cadastroByName = new Map(
      (cadastros ?? []).map((row) => [slugify(row.nome_cliente), row] as const),
    );

    const accounts = new Map<string, DashboardAccountRow>();

    for (const ativo of ativos ?? []) {
      const key = slugify(ativo.cliente);
      const cad = cadastroByName.get(key);
      accounts.set(key, {
        name: ativo.cliente,
        slug: cad?.slug ? slugify(cad.slug) : key,
        platforms: mergeDashboardPlatforms(
          ativo.plataformas_ativas,
          cad ? hubByCadastro.get(cad.id) : [],
        ),
        lastData:
          ativo.ultima_data_recebida != null ? String(ativo.ultima_data_recebida).slice(0, 10) : null,
      });
    }

    for (const cad of cadastros ?? []) {
      const key = slugify(cad.nome_cliente);
      const plugins = hubByCadastro.get(cad.id) ?? [];
      const existing = accounts.get(key);
      if (existing) {
        existing.platforms = mergeDashboardPlatforms(existing.platforms, plugins);
        existing.slug = cad.slug ? slugify(cad.slug) : existing.slug;
        continue;
      }
      if (plugins.length === 0) continue;
      accounts.set(key, {
        name: cad.nome_cliente,
        slug: cad.slug ? slugify(cad.slug) : key,
        platforms: mergeDashboardPlatforms([], plugins),
        lastData: null,
      });
    }

    return [...accounts.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  });

export const listHubPluginsForCadastroFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cadastroClienteId: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<string[]> => {
    const { data: cad, error: cadError } = await context.supabase
      .from("cadastro_clientes")
      .select("id")
      .eq("id", data.cadastroClienteId)
      .maybeSingle();
    if (cadError) throw new Error(cadError.message);
    if (!cad) return [];

    const { data: connections, error } = await getSupabaseAdmin()
      .from("ph_connections")
      .select("plugin_key")
      .eq("cadastro_id", data.cadastroClienteId)
      .eq("status", "active");
    if (error) throw new Error(error.message);
    return (connections ?? []).map((row) => String(row.plugin_key));
  });
