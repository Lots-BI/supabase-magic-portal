#!/usr/bin/env node
/**
 * Copia linhas Meta Ads de base_metricas_make → base_metricas_hub para uma data.
 * Uso: node scripts/engineering/hub-align-meta-day-from-make.mjs "Agência Lots" 2026-08-04
 * NÃO altera make.
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

const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnvFile(path.join(cwd, ".env"));

const cliente = process.argv[2] || "Agência Lots";
const data = process.argv[3] || "2026-08-04";
const url = process.env.OFFICIAL_SUPABASE_URL || process.env.VITE_OFFICIAL_SUPABASE_URL;
const key = process.env.OFFICIAL_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: makeRows, error: makeErr } = await sb
  .from("base_metricas_make")
  .select("data,cliente,plataforma,metrica,valor,campanha")
  .eq("data", data)
  .eq("plataforma", "Meta Ads")
  .ilike("cliente", `%${cliente}%`);

if (makeErr) {
  console.error(makeErr.message);
  process.exit(1);
}

console.log(`Make Meta Ads rows for ${data}: ${makeRows?.length ?? 0}`);

const { error: delErr } = await sb
  .from("base_metricas_hub")
  .delete()
  .eq("data", data)
  .eq("plataforma", "Meta Ads")
  .ilike("cliente", `%${cliente}%`);

if (delErr) {
  console.error(delErr.message);
  process.exit(1);
}

if ((makeRows?.length ?? 0) === 0) {
  console.log("Nada a inserir no Hub.");
  process.exit(0);
}

const payload = makeRows.map((r) => ({
  data: r.data,
  cliente: r.cliente,
  plataforma: r.plataforma,
  metrica: r.metrica,
  valor: r.valor,
  campanha: r.campanha,
}));

const { error: insErr } = await sb.from("base_metricas_hub").insert(payload);
if (insErr) {
  console.error(insErr.message);
  process.exit(1);
}

console.log(`Hub alinhado com Make para Meta Ads ${data} (${payload.length} rows). Make intocado.`);
