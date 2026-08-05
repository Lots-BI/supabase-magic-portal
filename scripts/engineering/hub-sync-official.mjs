#!/usr/bin/env node
/**
 * hub:sync-official — sync periódico Official API → base_metricas_hub.
 *
 * Uso:
 *   npm run hub:sync-official -- --connection=<uuid>
 *   npm run hub:sync-official -- --eligible
 *   npm run hub:sync-official -- --eligible --dry-run
 *
 * Variáveis: OFFICIAL_SUPABASE_URL, OFFICIAL_SERVICE_ROLE_KEY,
 *            HUB_CREDENTIAL_ENCRYPTION_KEY (+ OAuth secrets se refresh for necessário)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnvFile(path.join(cwd, ".env"));

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const entry = path.join(cwd, "src/modules/platform-hub-admin/cli/hub-sync-official.ts");
const result = spawnSync(
  npx,
  ["vite-node", "--config", "vitest.config.ts", entry, ...process.argv.slice(2)],
  { cwd, stdio: "inherit", env: process.env, shell: process.platform === "win32" },
);

process.exit(result.status ?? 1);
