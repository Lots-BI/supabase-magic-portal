#!/usr/bin/env node
/**
 * Gate H-02 — Database & Runtime Validation (Platform Hub RC1)
 * Somente leitura + probe de escrita compensada (insert + delete).
 * Uso: node scripts/engineering/hub-db-doctor.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const DOCTOR_CLIENTE = "__hub_doctor_rc1__";
const DOCTOR_PLATAFORMA = "hub_doctor";

/** Tabelas exigidas pela migration 28–30. */
const REQUIRED_TABLES = [
  "ph_connections",
  "ph_credentials",
  "ph_identities",
  "ph_sync_runs",
  "ph_timeline_events",
  "ph_homologation_reports",
  "ph_debug_traces",
  "ph_comparison_reports",
  "base_metricas_hub",
  "ph_metricas_source",
];

/** Tabelas com RLS habilitado nas migrations 28–30. */
const RLS_TABLES = REQUIRED_TABLES.filter((t) => t !== "ph_metricas_source");

/** Policies esperadas (migration 28, 29, 30). */
const EXPECTED_POLICIES = {
  ph_connections: ["ph_connections_admin_all"],
  ph_credentials: ["ph_credentials_admin_all"],
  ph_identities: ["ph_identities_admin_all"],
  ph_sync_runs: ["ph_sync_runs_admin_all"],
  ph_timeline_events: ["ph_timeline_admin_all"],
  ph_homologation_reports: ["ph_homologation_reports_admin_all"],
  ph_debug_traces: ["ph_debug_traces_admin_all"],
  ph_comparison_reports: ["ph_comparison_reports_admin_all"],
  base_metricas_hub: ["base_metricas_hub_admin_select"],
};

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

function isRlsPolicyError(error) {
  if (!error) return false;
  const msg = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    msg.includes("row-level security") ||
    msg.includes("row level security") ||
    msg.includes("permission denied") ||
    error.code === "42501"
  );
}

function line(ok, label, detail = "") {
  const icon = ok ? "✔" : "✖";
  const suffix = detail ? ` — ${detail}` : "";
  console.log(`${icon} ${label}${suffix}`);
  return ok;
}

export async function runHubDbDoctor(options = {}) {
  const root = options.cwd ?? process.cwd();
  if (!options.skipEnvLoad) {
    loadEnvFile(path.join(root, ".env"));
  }

  const url = process.env.OFFICIAL_SUPABASE_URL;
  const serviceRole = process.env.OFFICIAL_SERVICE_ROLE_KEY;
  const anonKey =
    process.env.OFFICIAL_SUPABASE_ANON_KEY || process.env.VITE_OFFICIAL_SUPABASE_ANON_KEY;

  const results = {
    connected: false,
    tables: false,
    policies: false,
    rls: false,
    writer: false,
    activeSource: false,
    serviceRole: false,
    runtimeReady: false,
    failures: [],
  };

  console.log("Platform Hub Doctor — Gate H-02 (Database & Runtime)");
  console.log("═".repeat(52));

  if (!url || !serviceRole) {
    line(
      false,
      "Banco conectado",
      "OFFICIAL_SUPABASE_URL / OFFICIAL_SERVICE_ROLE_KEY ausentes no .env",
    );
    results.failures.push("missing env");
    printSummary(results);
    return results;
  }

  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const anon =
    anonKey &&
    createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

  // 1. Conectividade
  const { error: pingError } = await admin.from("ph_metricas_source").select("id").limit(1);
  if (pingError && /does not exist|relation/i.test(pingError.message ?? "")) {
    results.connected = line(
      true,
      "Banco conectado",
      "Supabase respondeu (migrations 28–30 podem estar pendentes)",
    );
  } else if (pingError) {
    results.connected = line(false, "Banco conectado", pingError.message);
    results.failures.push(`connect: ${pingError.message}`);
  } else {
    results.connected = line(true, "Banco conectado");
  }

  // 2. Tabelas
  const missingTables = [];
  for (const table of REQUIRED_TABLES) {
    const { error } = await admin.from(table).select("*", { count: "exact", head: true });
    if (error) missingTables.push(`${table}: ${error.message}`);
  }
  if (missingTables.length === 0) {
    results.tables = line(
      true,
      "Tabelas encontradas",
      `${REQUIRED_TABLES.length}/${REQUIRED_TABLES.length}`,
    );
  } else {
    results.tables = line(
      false,
      "Tabelas encontradas",
      `${REQUIRED_TABLES.length - missingTables.length}/${REQUIRED_TABLES.length}`,
    );
    for (const m of missingTables) console.log(`    · ${m}`);
    results.failures.push(...missingTables);
  }

  // Service role — leitura (resultado impresso após Writer)
  let serviceRoleOk = results.connected && missingTables.length === 0;
  if (serviceRoleOk) {
    for (const table of REQUIRED_TABLES) {
      const { error } = await admin.from(table).select("*").limit(1);
      if (error) {
        serviceRoleOk = false;
        results.failures.push(`service_role read ${table}: ${error.message}`);
        break;
      }
    }
  }

  // 3–4. RLS + Policies (comportamental via anon, sem alterar dados)
  let rlsOk = true;
  let policiesOk = true;

  if (!anon) {
    rlsOk = false;
    policiesOk = false;
    line(false, "Policies OK", "anon key ausente — defina OFFICIAL_SUPABASE_ANON_KEY");
    line(false, "RLS OK", "anon key ausente");
    results.failures.push("missing anon key for RLS/policy probe");
  } else {
    for (const table of RLS_TABLES) {
      const { error: anonReadError, data: anonRows } = await anon.from(table).select("*").limit(1);

      if (
        anonReadError &&
        !/jwt|auth|permission|row-level security/i.test(anonReadError.message ?? "")
      ) {
        rlsOk = false;
        results.failures.push(`anon read ${table}: ${anonReadError.message}`);
      } else if (Array.isArray(anonRows) && anonRows.length > 0) {
        rlsOk = false;
        results.failures.push(`anon read ${table}: retornou dados sem autenticação`);
      }
    }

    const { error: anonInsertError } = await anon.from("ph_connections").insert({
      id: "00000000-0000-0000-0000-000000000099",
      plugin_key: "__hub_doctor__",
      label: "hub doctor probe",
      scope_ref: "cadastro:0",
      capability: "metrics_timeseries",
      active_provider_type: "make_passive",
    });

    if (!isRlsPolicyError(anonInsertError)) {
      policiesOk = false;
      rlsOk = false;
      const detail = anonInsertError?.message ?? "insert anon permitido (inesperado)";
      results.failures.push(`anon insert ph_connections: ${detail}`);
      await admin.from("ph_connections").delete().eq("id", "00000000-0000-0000-0000-000000000099");
    }

    const policyNames = Object.values(EXPECTED_POLICIES).flat();
    results.policies = line(
      policiesOk,
      "Policies OK",
      policiesOk ? `${policyNames.length} policies esperadas (probe anon)` : "",
    );
    results.rls = line(rlsOk, "RLS OK", rlsOk ? `${RLS_TABLES.length} tabelas verificadas` : "");
  }

  // 5. active_source = make
  const { data: sourceRow, error: sourceError } = await admin
    .from("ph_metricas_source")
    .select("active_source")
    .eq("id", 1)
    .maybeSingle();

  if (sourceError) {
    results.activeSource = line(false, "active_source = make", sourceError.message);
    results.failures.push(`active_source: ${sourceError.message}`);
  } else if (sourceRow?.active_source === "make") {
    results.activeSource = line(true, "active_source = make");
  } else {
    results.activeSource = line(
      false,
      "active_source = make",
      `valor atual: ${sourceRow?.active_source ?? "null"}`,
    );
    results.failures.push(`active_source is ${sourceRow?.active_source}`);
  }

  // 6. Writer probe — insert + read + delete (rollback compensado)
  let writerOk = false;
  const hubTableMissing = missingTables.some((m) => m.startsWith("base_metricas_hub"));
  if (!hubTableMissing) {
    const probe = {
      data: "2099-01-01",
      cliente: DOCTOR_CLIENTE,
      plataforma: DOCTOR_PLATAFORMA,
      metrica: "doctor_ping",
      valor: 0,
    };
    const { data: inserted, error: insertError } = await admin
      .from("base_metricas_hub")
      .insert(probe)
      .select("id")
      .maybeSingle();

    if (insertError) {
      writerOk = false;
      results.failures.push(`writer insert: ${insertError.message}`);
    } else if (!inserted?.id) {
      writerOk = false;
      results.failures.push("writer insert: sem id retornado");
    } else {
      const { data: readBack, error: readError } = await admin
        .from("base_metricas_hub")
        .select("id,cliente")
        .eq("id", inserted.id)
        .maybeSingle();

      const { error: deleteError } = await admin
        .from("base_metricas_hub")
        .delete()
        .eq("id", inserted.id);

      writerOk = !readError && readBack?.cliente === DOCTOR_CLIENTE && !deleteError;
      if (readError) results.failures.push(`writer read: ${readError.message}`);
      if (deleteError) results.failures.push(`writer rollback delete: ${deleteError.message}`);
    }
  }
  results.writer = line(
    writerOk,
    "Writer OK",
    writerOk ? "probe insert/read/delete em base_metricas_hub" : "",
  );

  results.serviceRole = line(serviceRoleOk, "Service role OK");

  // Runtime Ready — infra + env mínima (sem alterar Runtime)
  const runtimeEnvOk =
    Boolean(url) &&
    Boolean(serviceRole) &&
    results.connected &&
    results.tables &&
    results.serviceRole &&
    results.activeSource &&
    results.writer;

  results.runtimeReady = line(
    runtimeEnvOk && results.rls && results.policies,
    "Runtime Ready",
    runtimeEnvOk && results.rls && results.policies
      ? "banco + writer + homologação prontos"
      : "corrija os itens acima",
  );

  printSummary(results);
  return results;
}

function printSummary(results) {
  console.log("");
  const pass =
    results.connected &&
    results.tables &&
    results.policies &&
    results.rls &&
    results.writer &&
    results.activeSource &&
    results.serviceRole &&
    results.runtimeReady;

  console.log(pass ? "Gate H-02: PASS" : "Gate H-02: FAIL");
  if (!pass && results.failures.length > 0) {
    console.log(`\n${results.failures.length} problema(s) detectado(s).`);
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const results = await runHubDbDoctor();
  const pass =
    results.connected &&
    results.tables &&
    results.policies &&
    results.rls &&
    results.writer &&
    results.activeSource &&
    results.serviceRole &&
    results.runtimeReady;
  process.exit(pass ? 0 : 1);
}
