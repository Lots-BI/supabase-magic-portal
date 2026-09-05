#!/usr/bin/env node
/**
 * Lots BI — verificação do ambiente de desenvolvimento local.
 * Uso: npm run setup
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredNode = 22;
const nodeMajor = Number(process.versions.node.split(".")[0]);

const checks = [];
const warnings = [];

if (nodeMajor < requiredNode) {
  checks.push(`Node.js ${requiredNode}+ recomendado (atual: ${process.versions.node})`);
}

const envExample = path.join(root, ".env.example");
const envFile = path.join(root, ".env");

if (!fs.existsSync(envExample)) {
  checks.push("Arquivo .env.example ausente");
} else if (!fs.existsSync(envFile)) {
  warnings.push("Copie .env.example → .env e preencha as chaves Supabase");
} else {
  const env = fs.readFileSync(envFile, "utf8");
  const placeholders = ["your-anon-key-here", "your-service-role-key-here", "placeholder-anon-key"];
  if (placeholders.some((p) => env.includes(p))) {
    warnings.push(".env contém placeholders — substitua pelas chaves reais do Supabase");
  }
}

if (!fs.existsSync(path.join(root, "node_modules"))) {
  warnings.push("Execute npm install antes de npm run dev");
}

if (checks.length > 0) {
  console.error("❌ Setup incompleto:\n");
  for (const c of checks) console.error(`  - ${c}`);
  process.exit(1);
}

console.log("✅ Ambiente Lots BI — verificação básica OK\n");
console.log("Próximos passos:");
console.log("  1. npm install");
console.log("  2. cp .env.example .env  (e preencher chaves)");
console.log("  3. npm run dev");
console.log("  4. npm run check         (antes de cada PR)\n");

if (warnings.length > 0) {
  console.log("Avisos:");
  for (const w of warnings) console.warn(`  ⚠ ${w}`);
}
