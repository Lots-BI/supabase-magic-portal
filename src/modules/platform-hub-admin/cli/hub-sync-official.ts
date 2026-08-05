/**
 * Entry CLI — `npm run hub:sync-official` (via vite-node).
 */
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import { runOfficialSyncPass } from "@/modules/platform-hub-admin/services/run-official-sync-pass";
import type { PhConnectionAdminRowV1 } from "@/modules/platform-hub-bridges/ph-persistence/repositories/ph-admin-query.repository";

const ELIGIBLE_STAGES = new Set(["dual_run", "ready", "official_only", "make_off"]);

function argValue(prefix: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (!hit) return undefined;
  return hit.slice(prefix.length) || undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function isEligible(row: PhConnectionAdminRowV1): boolean {
  return (
    row.status === "active" &&
    row.activeProviderType === "official_api" &&
    ELIGIBLE_STAGES.has(row.migrationStage)
  );
}

async function main(): Promise<void> {
  const dryRun = hasFlag("--dry-run");
  const eligible = hasFlag("--eligible");
  const connectionArg = argValue("--connection=");
  const actor = process.env.HUB_SYNC_ACTOR?.trim() || "scheduler:official";

  if (!connectionArg && !eligible) {
    console.error("Uso:");
    console.error("  npm run hub:sync-official -- --connection=<uuid>");
    console.error("  npm run hub:sync-official -- --eligible");
    console.error("  npm run hub:sync-official -- --eligible --dry-run");
    process.exit(2);
  }

  const stack = await createAdminHubStack(getSupabaseAdmin());
  let targets: PhConnectionAdminRowV1[] = [];

  if (connectionArg) {
    const row = await stack.adminQueries.getConnection(connectionArg);
    if (!row) {
      console.error(`Conexão não encontrada: ${connectionArg}`);
      process.exit(1);
    }
    targets = [row];
  } else {
    const all = await stack.adminQueries.listConnections();
    targets = all.filter(isEligible);
  }

  console.log("");
  console.log("Hub sync official");
  console.log("─".repeat(40));
  console.log(`Alvos: ${targets.length}${dryRun ? " (dry-run)" : ""}`);
  console.log(`Actor: ${actor}`);
  console.log("");

  if (targets.length === 0) {
    console.log("Nenhuma conexão elegível (active + official_api + dual_run|ready|…).");
    process.exit(0);
  }

  let failures = 0;

  for (const row of targets) {
    const label = `${row.label} (${row.id}) · ${row.pluginKey} · stage=${row.migrationStage}`;
    if (dryRun) {
      console.log(`[dry-run] ${label}`);
      continue;
    }

    process.stdout.write(`Sync ${label} … `);
    try {
      const pass = await runOfficialSyncPass(stack, {
        connectionId: row.id,
        actorEmail: actor,
      });
      if (pass.status === "success") {
        console.log(`ok (${pass.rows} rows, ${pass.durationMs}ms)`);
      } else {
        failures += 1;
        console.log(`FAIL: ${pass.error ?? "unknown"}`);
      }
    } catch (error) {
      failures += 1;
      console.log(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("");
  if (failures > 0) {
    console.error(`Concluído com ${failures} falha(s).`);
    process.exit(1);
  }
  console.log("Concluído.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
