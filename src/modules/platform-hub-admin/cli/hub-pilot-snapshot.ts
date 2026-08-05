/**
 * Snapshot operacional do Hub (sem imprimir tokens).
 * Uso: npx vite-node --config vitest.config.ts src/modules/platform-hub-admin/cli/hub-pilot-snapshot.ts
 */
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import { runConnectionDiagnostics } from "@/modules/platform-hub-admin/services/run-diagnostics";
import { META_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/meta_ads/meta-credential-keys";
import { asConnectionId } from "../../../../contracts/connection/connection-id.v1";
import { createCredentialAccess } from "@/modules/platform-hub/plugins/_internal/oauth/credential-access.port";

async function main() {
  const stack = await createAdminHubStack(getSupabaseAdmin());
  const connections = await stack.adminQueries.listConnections({ pluginKey: "meta_ads" });
  const official = connections.filter((c) => c.activeProviderType === "official_api");

  console.log("");
  console.log("Hub pilot snapshot");
  console.log("─".repeat(56));
  console.log(`Conexões meta_ads: ${connections.length} · official_api: ${official.length}`);
  console.log("");

  if (official.length === 0) {
    console.log("Nenhuma conexão Official Meta. Conecte em /admin/conexoes.");
    process.exit(1);
  }

  const access = createCredentialAccess(stack.credentialVault);

  for (const row of official) {
    const id = asConnectionId(row.id);
    const identities = await stack.identityService.list(id);
    const oauth = await access.retrieveOAuthToken(id, META_OAUTH_CREDENTIAL_KEY);
    const diag = await runConnectionDiagnostics(stack, row.id);
    const primary = identities.find((i) => i.isPrimary);

    console.log(`• ${row.label}`);
    console.log(`  id: ${row.id}`);
    console.log(`  cliente: ${row.clienteNome ?? "—"} (cadastro ${row.cadastroId ?? "—"})`);
    console.log(`  status/health: ${row.status} / ${row.healthStatus} (score ${row.healthScore ?? "—"})`);
    console.log(`  stage: ${row.migrationStage}`);
    console.log(`  lastSync: ${row.lastSyncAt ?? "—"} · ${row.lastSyncStatus ?? "—"}`);
    console.log(`  metricsCount: ${row.metricsCount}`);
    console.log(`  OAuth vault: ${oauth?.accessToken ? "presente" : "AUSENTE"}`);
    if (oauth?.expiresAt) console.log(`  token expira: ${oauth.expiresAt}`);
    if (oauth?.scopes?.length) console.log(`  scopes: ${oauth.scopes.join(", ")}`);
    console.log(
      `  identities: ${identities.length}` +
        (primary ? ` · primary=${primary.identityType}:${primary.externalId}` : " · SEM primary"),
    );
    for (const i of identities) {
      console.log(
        `    - ${i.identityType} ${i.externalId} ${i.isPrimary ? "(primary)" : ""} · ${i.label}`,
      );
    }
    console.log(`  diagnóstico: ${diag.overall}`);
    for (const c of diag.checks.filter((x) => x.status !== "ok")) {
      console.log(`    [${c.status}] ${c.id}: ${c.detail}`);
    }
    console.log("");
  }

  const { data: source } = await getSupabaseAdmin()
    .from("ph_metricas_source")
    .select("active_source, updated_at")
    .eq("id", 1)
    .maybeSingle();
  console.log(`ph_metricas_source: ${source?.active_source ?? "?"} (updated ${source?.updated_at ?? "—"})`);

  const { count: hubRows } = await getSupabaseAdmin()
    .from("base_metricas_hub")
    .select("*", { count: "exact", head: true });
  console.log(`base_metricas_hub rows: ${hubRows ?? 0}`);
  console.log("");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
