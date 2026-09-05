#!/usr/bin/env node
/**
 * Lots BI — deploy para Cloudflare Workers (pós-build Nitro).
 * Requer: npm run build concluído, wrangler autenticado (CLOUDFLARE_API_TOKEN).
 *
 * Uso: npm run deploy:cloudflare
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const serverDir = path.join(root, ".output", "server");
const wranglerJson = path.join(serverDir, "wrangler.json");

if (!fs.existsSync(wranglerJson)) {
  console.error("❌ .output/server/wrangler.json não encontrado. Execute npm run build primeiro.");
  process.exit(1);
}

console.log("→ Deploy Cloudflare Workers a partir de .output/server …\n");

const result = spawnSync("npx", ["wrangler", "deploy"], {
  cwd: serverDir,
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
