#!/usr/bin/env node
/**
 * Lots BI — preview local do build de produção (Nitro + Cloudflare Workers).
 * Requer: npm run build concluído.
 *
 * Uso: npm run preview [-- --port 4173]
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

const portArg = process.argv.find((a) => a.startsWith("--port"));
const port = portArg?.includes("=")
  ? portArg.split("=")[1]
  : process.argv[process.argv.indexOf("--port") + 1];
const wranglerArgs = ["wrangler", "dev"];
if (port) {
  wranglerArgs.push("--port", port);
  wranglerArgs.push("--ip", "0.0.0.0");
}

console.log(`→ Preview de produção${port ? ` (porta ${port})` : ""}…\n`);

const result = spawnSync("npx", wranglerArgs, {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
