#!/usr/bin/env node
/**
 * hub:cutover — prepara / aplica flip de ph_metricas_source (Make ↔ Hub).
 *
 * PADRÃO: dry-run (não altera nada).
 *
 * Uso:
 *   npm run hub:cutover                  # mostra estado atual
 *   npm run hub:cutover -- --to=hub --confirm=hub
 *   npm run hub:cutover -- --to=make --confirm=make   # rollback
 *
 * Nunca rode --confirm=hub sem Go/No-Go do dual-run.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

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

function argValue(prefix) {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (!hit) return undefined;
  return hit.slice(prefix.length) || undefined;
}

const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnvFile(path.join(cwd, ".env"));

const url =
  process.env.OFFICIAL_SUPABASE_URL ||
  process.env.VITE_OFFICIAL_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;
const serviceRole = process.env.OFFICIAL_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error("Faltam OFFICIAL_SUPABASE_URL e/ou OFFICIAL_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const to = argValue("--to=");
const confirm = argValue("--confirm=");

const supabase = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: current, error: readError } = await supabase
  .from("ph_metricas_source")
  .select("id, active_source, updated_at")
  .eq("id", 1)
  .maybeSingle();

if (readError) {
  console.error(`Leitura falhou: ${readError.message}`);
  process.exit(1);
}

console.log("");
console.log("Hub cutover — ph_metricas_source");
console.log("─".repeat(40));
console.log(`Atual: active_source = ${current?.active_source ?? "(ausente)"}`);
console.log(`updated_at: ${current?.updated_at ?? "—"}`);
console.log("");

if (!to) {
  console.log("Dry-run (sem --to). Dashboards continuam na fonte acima.");
  console.log("");
  console.log("Para aplicar (só após Go/No-Go):");
  console.log("  npm run hub:cutover -- --to=hub --confirm=hub");
  console.log("Rollback:");
  console.log("  npm run hub:cutover -- --to=make --confirm=make");
  process.exit(0);
}

if (to !== "hub" && to !== "make") {
  console.error("--to deve ser hub ou make");
  process.exit(2);
}

if (confirm !== to) {
  console.error(`Recusa de segurança: use --confirm=${to} junto com --to=${to}`);
  console.error("Nenhuma alteração feita.");
  process.exit(2);
}

if (current?.active_source === to) {
  console.log(`Já está em '${to}'. Nada a fazer.`);
  process.exit(0);
}

const { error: writeError } = await supabase
  .from("ph_metricas_source")
  .update({ active_source: to, updated_at: new Date().toISOString() })
  .eq("id", 1);

if (writeError) {
  console.error(`Update falhou: ${writeError.message}`);
  process.exit(1);
}

console.log(`Aplicado: active_source = '${to}'`);
console.log("Validar dashboards e vw_metricas imediatamente.");
if (to === "hub") {
  console.log("Rollback: npm run hub:cutover -- --to=make --confirm=make");
}
