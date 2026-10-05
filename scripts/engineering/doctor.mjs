#!/usr/bin/env node
/**
 * hub:doctor — Gate H-02 (banco) + auditoria de registry/plugins (código).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { listPluginDirs, pluginFilePaths } from "../architecture-validation/lib/plugin-paths.mjs";
import {
  loadManifest,
  validateManifestObject,
  collectCapabilitiesFromPlugins,
} from "../architecture-validation/lib/parse-manifest.mjs";
import { runHubDbDoctor } from "./hub-db-doctor.mjs";

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

const cwd = process.cwd();
const issues = [];

async function main() {
  loadEnvFile(path.join(cwd, ".env"));
  const db = await runHubDbDoctor({ cwd, skipEnvLoad: true });

  console.log("");
  console.log("Platform Hub Doctor — Registry & Plugins");
  console.log("─".repeat(40));

  for (const { key, dir } of listPluginDirs(cwd)) {
    const paths = pluginFilePaths(dir, key);
    if (!fs.existsSync(paths.manifestJson)) issues.push(`plugin sem manifest: ${key}`);
    if (!fs.existsSync(paths.register)) issues.push(`plugin sem register: ${key}`);

    const loaded = loadManifest(dir, key);
    if (!loaded.ok) {
      issues.push(loaded.error);
      continue;
    }
    for (const e of validateManifestObject(loaded.manifest, key)) {
      issues.push(`${key}: versionamento/manifest inválido — ${e}`);
    }
    const providerFiles = fs.existsSync(paths.providersDir)
      ? fs.readdirSync(paths.providersDir).filter((f) => f.endsWith(".ts"))
      : [];
    if (providerFiles.length === 0) {
      issues.push(`${key}: provider ausente (providers/ vazio)`);
    }
  }

  const dupes = collectCapabilitiesFromPlugins(cwd, listPluginDirs, loadManifest);
  for (const d of dupes) {
    issues.push(`capability duplicada: ${d.capability} (${d.plugins.join(", ")})`);
  }

  const contract = spawnSync(
    process.execPath,
    ["scripts/architecture-validation/contract-compat.mjs"],
    { cwd, encoding: "utf8" },
  );
  if (contract.status !== 0) {
    issues.push("contract incompatível (contract-compat falhou)");
  }

  if (issues.length === 0) {
    console.log("✔ Registry & plugins OK");
  } else {
    for (const i of issues) console.log(`✖ ${i}`);
  }

  const dbPass =
    db.connected &&
    db.tables &&
    db.policies &&
    db.rls &&
    db.writer &&
    db.activeSource &&
    db.serviceRole &&
    db.runtimeReady;

  console.log("");
  if (dbPass && issues.length === 0) {
    console.log("hub:doctor — ALL PASS");
    process.exit(0);
  }
  console.log("hub:doctor — FAIL");
  process.exit(1);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  await main();
}
