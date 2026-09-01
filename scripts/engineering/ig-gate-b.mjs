#!/usr/bin/env node
/**
 * Gate B — valida app Meta + token piloto + endpoints de mídia Instagram.
 * Uso: npm run ig:gate-b
 */
import { createClient } from "@supabase/supabase-js";

const META_APP_ID = process.env.META_APP_ID?.trim();
const META_APP_SECRET = process.env.META_APP_SECRET?.trim();
const SUPABASE_URL = process.env.OFFICIAL_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.OFFICIAL_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const PILOT_CONNECTION_ID = process.env.IG_GATE_B_CONNECTION_ID?.trim();

function fail(message: string) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function ok(message: string) {
  console.log(`✅ ${message}`);
}

async function graphGet(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`https://graph.facebook.com/v22.0/${path}`);
  url.searchParams.set("access_token", token);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? `HTTP ${response.status}`);
  }
  return body;
}

async function main() {
  if (!META_APP_ID || !META_APP_SECRET) {
    fail("META_APP_ID e META_APP_SECRET são obrigatórios");
  }
  ok("META_APP_ID configurado");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    fail("OFFICIAL_SUPABASE_URL e OFFICIAL_SERVICE_ROLE_KEY são obrigatórios");
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  if (!PILOT_CONNECTION_ID) {
    const { data: conn } = await supabase
      .from("ph_connections")
      .select("id, cadastro_id")
      .eq("plugin_key", "instagram_organic")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!conn?.id) fail("Nenhuma conexão instagram_organic ativa — crie em /admin/conexoes");
    ok(`Conexão piloto: ${conn.id}`);
    await runForConnection(supabase, conn.id);
    return;
  }

  await runForConnection(supabase, PILOT_CONNECTION_ID);
}

async function runForConnection(
  supabase: ReturnType<typeof createClient>,
  connectionId: string,
) {
  const token =
    process.env.IG_GATE_B_ACCESS_TOKEN?.trim() ?? process.env.GATE_A_META_ACCESS_TOKEN?.trim();
  if (!token) fail("Defina IG_GATE_B_ACCESS_TOKEN ou GATE_A_META_ACCESS_TOKEN");
  ok("Access token disponível");

  const { data: identity } = await supabase
    .from("ph_identities")
    .select("external_id")
    .eq("connection_id", connectionId)
    .eq("identity_type", "instagram")
    .eq("is_primary", true)
    .maybeSingle();

  if (!identity?.external_id) fail("Identidade instagram primária não encontrada");
  ok(`IG User ID: ${identity.external_id}`);

  const media = await graphGet(`${identity.external_id}/media`, token, {
    fields: "id,media_type,media_product_type",
    limit: "5",
  });
  const first = media.data?.[0];
  if (!first?.id) fail("/media não retornou publicações");
  ok(`media list OK (${media.data.length} itens)`);

  const insights = await graphGet(`${first.id}/insights`, token, {
    metric: "views,reach,likes,comments",
  });
  ok(`insights OK (${insights.data?.length ?? 0} métricas)`);
  console.log("\nGate B: PASS");
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
