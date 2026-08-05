#!/usr/bin/env node
/**
 * Compara Make vs Hub para um cliente/data (sem secrets no stdout além de agregados).
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

async function summarize(table) {
  const { data: rows, error } = await sb
    .from(table)
    .select("id,cliente,plataforma,metrica,valor,data,campanha,created_at")
    .eq("data", data)
    .ilike("cliente", `%${cliente.replace(/%/g, "")}%`)
    .order("metrica")
    .order("created_at");
  if (error) throw new Error(`${table}: ${error.message}`);
  const byKey = new Map();
  for (const r of rows ?? []) {
    const k = `${r.plataforma}|${r.metrica}|${r.campanha ?? ""}`;
    const list = byKey.get(k) ?? [];
    list.push(r);
    byKey.set(k, list);
  }
  console.log(`\n=== ${table} · data=${data} · rows=${rows?.length ?? 0} ===`);
  for (const [k, list] of byKey) {
    const sum = list.reduce((a, r) => a + Number(r.valor ?? 0), 0);
    console.log(
      `  ${k} · n=${list.length} · sum=${sum} · values=[${list.map((r) => r.valor).join(", ")}]`,
    );
  }
  return rows ?? [];
}

const make = await summarize("base_metricas_make");
const hub = await summarize("base_metricas_hub");

const hubImp = hub.filter((r) => String(r.metrica).toLowerCase().includes("impression"));
const makeImp = make.filter((r) => String(r.metrica).toLowerCase().includes("impression"));
console.log("\n=== impressions focus ===");
console.log(
  `make impressions rows=${makeImp.length} sum=${makeImp.reduce((a, r) => a + Number(r.valor), 0)}`,
);
console.log(
  `hub impressions rows=${hubImp.length} sum=${hubImp.reduce((a, r) => a + Number(r.valor), 0)}`,
);
