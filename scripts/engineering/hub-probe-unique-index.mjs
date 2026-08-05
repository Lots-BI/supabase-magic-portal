#!/usr/bin/env node
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

const probe = {
  data: "2099-01-01",
  cliente: "__probe_uq__",
  plataforma: "Meta Ads",
  metrica: "impressions",
  valor: 1,
  campanha: "probe",
};

await sb.from("base_metricas_hub").delete().eq("cliente", "__probe_uq__");
const a = await sb.from("base_metricas_hub").insert(probe);
const b = await sb.from("base_metricas_hub").insert(probe);
console.log("first:", a.error?.message || "ok");
console.log(
  "second:",
  b.error ? `${b.error.code || ""} ${b.error.message}` : "ok (NO UNIQUE INDEX YET)",
);
await sb.from("base_metricas_hub").delete().eq("cliente", "__probe_uq__");
