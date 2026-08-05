/**
 * Entry CLI — `npm run hub:diagnose` (via vite-node).
 */
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import { runConnectionDiagnostics } from "@/modules/platform-hub-admin/services/run-diagnostics";

function argValue(prefix: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (!hit) return undefined;
  return hit.slice(prefix.length) || undefined;
}

async function main(): Promise<void> {
  const connectionId = argValue("--connection=");
  if (!connectionId) {
    console.error("Uso: npm run hub:diagnose -- --connection=<uuid>");
    process.exit(2);
  }

  const stack = await createAdminHubStack(getSupabaseAdmin());
  const report = await runConnectionDiagnostics(stack, connectionId);

  console.log("");
  console.log(`Diagnóstico ${connectionId}`);
  console.log(`Overall: ${report.overall} · ${report.ranAt}`);
  console.log("─".repeat(56));
  for (const check of report.checks) {
    const mark =
      check.status === "ok" ? "OK " : check.status === "warning" ? "WARN" : "ERR ";
    console.log(`[${mark}] ${check.id.padEnd(18)} ${check.label}: ${check.detail}`);
  }
  console.log("");

  if (report.overall === "error") process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
