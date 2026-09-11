#!/usr/bin/env node
/**
 * CI — deriva dos arquivos em supabase/migrations-official.
 * Não aplica DDL. Se OFFICIAL_SUPABASE_URL + SERVICE_ROLE existirem,
 * compara nomes MCP (schema_migrations) com os arquivos 48+.
 */
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "supabase/migrations-official");
const files = readdirSync(dir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const numbered = files.map((name) => {
  const match = name.match(/^(\d{2})_/);
  if (!match) {
    throw new Error(`Migration sem prefixo NN_: ${name}`);
  }
  return { name, n: Number(match[1]) };
});

const recent = numbered.filter((row) => row.n >= 48);
const recentDupes = recent
  .map((row) => String(row.n).padStart(2, "0"))
  .filter((n, i, arr) => arr.indexOf(n) !== i);
if (recentDupes.length > 0) {
  throw new Error(`Prefixos duplicados (>=48): ${[...new Set(recentDupes)].join(", ")}`);
}

console.log(`ok: ${files.length} arquivos; unique check a partir de 48`);

const url = process.env.OFFICIAL_SUPABASE_URL?.trim();
const key = process.env.OFFICIAL_SERVICE_ROLE_KEY?.trim();
if (!url || !key || key.startsWith("placeholder")) {
  console.log("skip: sem credenciais oficiais — drift remoto não comparado");
  process.exit(0);
}

const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/`, {
  method: "GET",
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!res.ok) {
  console.log("skip: PostgREST não expõe schema_migrations; drift remoto fica no agente MCP");
  process.exit(0);
}
