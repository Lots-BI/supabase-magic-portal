#!/usr/bin/env node
/**
 * Dedupa base_metricas_hub (somente Hub). Mantém o registro mais recente por chave natural.
 * NÃO toca base_metricas_make.
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

const url = process.env.OFFICIAL_SUPABASE_URL || process.env.VITE_OFFICIAL_SUPABASE_URL;
const key = process.env.OFFICIAL_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: rows, error } = await sb
  .from("base_metricas_hub")
  .select("id,cliente,plataforma,metrica,data,campanha,valor,created_at")
  .order("created_at", { ascending: false });

if (error) {
  console.error(error.message);
  process.exit(1);
}

const keep = new Set();
const remove = [];
for (const r of rows ?? []) {
  const k = [r.cliente, r.plataforma, r.metrica, r.data, r.campanha ?? ""].join("\u0001");
  if (keep.has(k)) remove.push(r.id);
  else keep.add(k);
}

console.log(`Hub rows=${rows?.length ?? 0} · keep=${keep.size} · remove=${remove.length}`);

for (let i = 0; i < remove.length; i += 200) {
  const chunk = remove.slice(i, i + 200);
  const { error: delErr } = await sb.from("base_metricas_hub").delete().in("id", chunk);
  if (delErr) {
    console.error(delErr.message);
    process.exit(1);
  }
}

console.log("Dedupa Hub concluída (make intocado).");
