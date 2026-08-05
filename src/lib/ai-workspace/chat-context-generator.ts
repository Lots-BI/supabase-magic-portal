import type { DocEntry } from "@/lib/knowledge-center/types";
import type { AiWorkspaceSnapshotCore } from "./types";
import { computeContextScore } from "./context-score";
import {
  extractAllSections,
  extractBulletList,
  extractSection,
  firstParagraphs,
  stripMarkdownInline,
} from "./extractors/markdown-sections";
import { markdownToPlainText } from "./prompt-generator";
import {
  buildChatModuleProfiles,
  buildPlatformTimeline,
  type ChatModuleProfile,
} from "./sources/chat-enrichment";
import { formatPlatformHubMarkdown } from "./sources/platform-hub";
import { formatDataSourcesMarkdown } from "./sources/data-sources";

function hr(): string {
  return "\n---\n";
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim()}\n`;
}

function buildProductSection(
  docs: Map<string, DocEntry>,
  snapshot: AiWorkspaceSnapshotCore,
): string {
  const product = docs.get("01-product/product-overview");
  const mission = docs.get("00-company/mission");
  const startHere = docs.get("start-here");

  const problem = product ? extractSection(product.body, "O problema") : "";
  const solution = product ? extractSection(product.body, "A solução") : "";
  const future = product ? firstParagraphs(extractSection(product.body, "A solução"), 3) : "";

  const parts = [
    "**Lots BI** (Lotus) é um SaaS de Business Intelligence para agências e empresas que operam marketing digital.",
    "",
    snapshot.overview.summary,
    "",
    problem ? `**Problema:** ${stripMarkdownInline(firstParagraphs(problem, 2))}` : "",
    solution ? `**Solução:** ${stripMarkdownInline(firstParagraphs(solution, 2))}` : "",
    mission ? `**Missão:** ${stripMarkdownInline(firstParagraphs(mission.body, 2))}` : "",
    startHere
      ? `**Visão de longo prazo:** ${stripMarkdownInline(firstParagraphs(extractSection(startHere.body, "Dois estados — leia isto antes de tudo (10 minutos)") || startHere.body, 2))}`
      : "",
    "",
    "**Público-alvo:**",
    ...extractBulletList(product?.body ?? "", 4)
      .slice(0, 4)
      .map((b) => `- ${b}`),
  ];

  return parts.filter(Boolean).join("\n");
}

function buildPhilosophySection(
  docs: Map<string, DocEntry>,
  snapshot: AiWorkspaceSnapshotCore,
): string {
  const philosophy = docs.get("00-company/philosophy");
  const principles: string[] = [];

  if (philosophy) {
    for (const sec of extractAllSections(philosophy.body)) {
      if (sec.title.match(/^\d+\./)) {
        principles.push(
          `**${sec.title}** — ${stripMarkdownInline(firstParagraphs(sec.content, 1))}`,
        );
      }
    }
  }

  const architecturePrinciples = snapshot.conventions
    .filter((c) =>
      /repository|single source|server function|module|acoplamento|duplicar|boundary/i.test(
        `${c.title} ${c.description}`,
      ),
    )
    .slice(0, 8)
    .map((c) => `- **${c.title}:** ${c.description}`);

  return [
    "A plataforma é construída sobre princípios claros que guiam toda decisão técnica e de produto:",
    "",
    ...principles.slice(0, 6),
    "",
    "**Princípios arquiteturais derivados do código e da governança:**",
    ...architecturePrinciples,
    "",
    "- **Evolução incremental:** novas capacidades entram como módulos registrados, sem rewrites.",
    "- **Baixo acoplamento:** domínios se comunicam via contratos (server functions, command bus, eventos).",
    "- **Nunca duplicar lógica nem dados:** uma fonte por conceito — docs em `docs/`, código em `src/modules/`.",
  ].join("\n");
}

function buildArchitectureNarrative(snapshot: AiWorkspaceSnapshotCore): string {
  const layers = snapshot.architecture.layers
    .map((l) => `- **${l.name}:** ${l.description}`)
    .join("\n");

  return [
    snapshot.architecture.summary,
    "",
    "A plataforma funciona como um fluxo em camadas. A interface React (TanStack Start) nunca fala diretamente com o banco — toda operação passa por server functions autenticadas. A lógica de negócio vive em módulos de domínio (`src/modules/`). O acesso a dados Postgres/Supabase é isolado em repositories. O Postgres aplica RLS para multi-tenant.",
    "",
    "**Como os módulos se relacionam:**",
    "- **Auth** autentica sessão; **Access** autoriza e gerencia lifecycle.",
    "- **Admin** opera usuários; **Client** expõe portal read-only ao cliente final.",
    "- **Approval** (Content Workflow) produz e aprova conteúdo; consome escopo do Client.",
    "- **Agency OS** opera CRM/pipeline/intelligence; usa **Core** (command bus, registries).",
    "- **Core** integra módulos sem acoplamento direto entre domínios.",
    "",
    layers,
  ].join("\n");
}

function formatModuleProfile(m: ChatModuleProfile): string {
  return [
    `### ${m.name}`,
    "",
    `**Responsabilidade:** ${m.responsibility}`,
    "",
    "**O que pode fazer:**",
    ...m.canDo.map((c) => `- ${c}`),
    "",
    "**O que nunca deve fazer:**",
    ...(m.mustNever.length
      ? m.mustNever.map((n) => `- ${n}`)
      : ["- Violar boundaries documentados nos ADRs"]),
    "",
    `**Dependências:** ${m.dependencies.join(", ") || "Supabase"}`,
    `**Estado atual:** ${m.state}`,
    `_Fonte: ${m.source}_`,
  ].join("\n");
}

function buildDatabaseNarrative(
  snapshot: AiWorkspaceSnapshotCore,
  docs: Map<string, DocEntry>,
): string {
  const schema = docs.get("04-database/schema");
  const intro = schema
    ? firstParagraphs(schema.body, 2)
    : snapshot.database.summaryMarkdown.slice(0, 400);

  return [
    intro,
    "",
    "O Lots BI usa **Supabase** como backend: **Postgres** para dados relacionais, **Auth** para identidade JWT, **Storage** para mídia editorial, e **RLS** em todas as tabelas de domínio.",
    "",
    `Hoje existem **${snapshot.database.tables.length} tabelas** definidas em **${snapshot.database.migrationFiles.length} migrations** oficiais. Evolução do schema é sempre aditiva via \`supabase/migrations-official/\`.`,
    "",
    "**Padrão de acesso:** UI → Server Function → Service (lógica pura) → Repository → Supabase/Postgres.",
    "",
    "Tabelas centrais do domínio:",
    ...snapshot.database.tables
      .filter((t) =>
        ["content_cards", "cadastro_clientes", "client_access", "user_roles", "profiles"].includes(
          t.name,
        ),
      )
      .map((t) => `- \`${t.name}\` (${t.migration})`),
  ].join("\n");
}

function buildReadyFeatures(snapshot: AiWorkspaceSnapshotCore): string {
  const mature = snapshot.roadmap.completed
    .slice(0, 8)
    .map((i) => stripMarkdownInline(i.text.replace(/✅/u, "")))
    .filter((t) => t.length > 10);

  const unreleased = snapshot.changelog.unreleased.slice(0, 6).map((i) => stripMarkdownInline(i));

  const paragraphs: string[] = [
    "A plataforma já entrega um conjunto maduro de capacidades para operação de agência e clientes finais.",
  ];

  if (mature.length) {
    paragraphs.push("", "**Capacidades consolidadas:** " + mature.join(". ") + ".");
  }

  if (unreleased.length) {
    paragraphs.push("", "**Entregas recentes (changelog):** " + unreleased.join(". ") + ".");
  }

  paragraphs.push(
    "",
    "Inclui dashboards multi-plataforma (Meta, Google, GA4, Instagram), gestão admin de clientes e usuários, Content Workflow completo (kanban, aprovações, biblioteca), Plano Estratégico, Knowledge Center, Platform Tutorial e AI Workspace.",
  );

  return paragraphs.join("\n");
}

function buildPlannedFeatures(snapshot: AiWorkspaceSnapshotCore): string {
  const planned = snapshot.roadmap.planned
    .slice(0, 10)
    .map((i) => `- ${stripMarkdownInline(i.text)}`);
  const inProgress = snapshot.roadmap.inProgress
    .slice(0, 8)
    .map((i) => `- ${stripMarkdownInline(i.text)}`);

  return [
    "**Em andamento:**",
    ...(inProgress.length ? inProgress : ["- Consultar roadmap.md"]),
    "",
    "**Planejado:**",
    ...(planned.length ? planned : ["- Evoluções listadas em docs/11-roadmap/roadmap.md"]),
  ].join("\n");
}

function buildGoldenRules(snapshot: AiWorkspaceSnapshotCore): string {
  const rules = snapshot.conventions.filter((c) =>
    /repository|supabase|server function|module|duplicar|boundary|auth|access/i.test(
      `${c.title} ${c.description}`,
    ),
  );

  return [
    "Estas regras são invioláveis ao trabalhar na plataforma:",
    "",
    "```",
    "UI",
    " ↓",
    "Server Function",
    " ↓",
    "Service (lógica pura)",
    " ↓",
    "Repository",
    " ↓",
    "Supabase / Postgres",
    "```",
    "",
    ...rules.slice(0, 10).map((r) => `- **${r.title}:** ${r.description}`),
    "",
    "- Nunca acessar Supabase diretamente da UI ou de services.",
    "- Nunca criar módulos paralelos se já existir domínio responsável em `src/modules/`.",
    "- Nunca duplicar lógica — reutilize repositories, services e convenções existentes.",
    "- Nunca quebrar boundaries validados em CI (`validate-*-boundaries.mjs`).",
  ].join("\n");
}

function buildCurrentState(snapshot: AiWorkspaceSnapshotCore, contextScoreTotal: number): string {
  const mature = snapshot.modules.filter(
    (m) => m.id === "auth" || m.id === "access" || m.id === "approval",
  );
  const evolving = snapshot.modules.filter((m) => m.id === "agency-os" || m.id === "core");

  return [
    "**Maduro e estabilizado:** Auth Module v3, Access lifecycle, Content Workflow (Approval), portal Cliente, dashboards analíticos, Knowledge Center.",
    "",
    "**Em consolidação ativa:** Agency OS (Central operacional), OS Core (command bus, registries), AI Workspace.",
    "",
    "**Platform Hub:** CONGELADO (ago/2026) — Marcos 1–4 no código, dual-run Make, branch `feature/marco1-hub-meta-piloto` no GitHub. Sem cutover. Retomar: `docs/13-platform-hub/manual-ops-checklist.md`.",
    "",
    "**Dívidas conhecidas:**",
    ...(snapshot.limitations.length
      ? snapshot.limitations.map((l) => `- ${l}`)
      : ["- Consultar AUDIT.md e roadmap 🔧"]),
    "",
    `**Context Score da documentação:** ${contextScoreTotal}% — indica cobertura automática do handbook.`,
  ].join("\n");
}

function buildCurrentObjective(snapshot: AiWorkspaceSnapshotCore): string {
  const focus = snapshot.roadmap.inProgress.slice(0, 5).map((i) => stripMarkdownInline(i.text));
  return [
    "Com base no roadmap oficial, o foco atual da plataforma é:",
    "",
    ...(focus.length
      ? focus.map((f, i) => `${i + 1}. ${f}`)
      : ["1. Estabilizar Agency OS e OS Core"]),
    "",
    "**Fase atual:** evolução de produto sobre fundações de engenharia já estabelecidas (Auth v3, Content Workflow v1, Sistema de Engenharia).",
  ].join("\n");
}

function buildAiInstructions(snapshot: AiWorkspaceSnapshotCore): string {
  return [
    "Antes de sugerir qualquer implementação, você **deve** verificar:",
    "",
    "1. **Arquitetura existente** — TanStack Start + Supabase, módulos em `src/modules/`.",
    "2. **Módulos existentes** — " + snapshot.modules.map((m) => m.label).join(", ") + ".",
    "3. **ADRs** — " +
      snapshot.adrs.filter((a) => /aceito/i.test(a.status)).length +
      " decisões aceitas em `docs/02-architecture/adr/`.",
    "4. **Repository Pattern** — Supabase só em `*.repository.server.ts`.",
    "5. **Single Source of Truth** — docs em Knowledge Center; não inventar comportamento.",
    "6. **Reutilização** — estender domínio existente antes de criar paralelo.",
    "",
    "**Nunca** sugira criar um módulo novo se já existir um domínio responsável.",
    "**Sempre** preserve consistência arquitetural e respeite RLS/multi-tenant.",
    "**Sempre** responda considerando todo o contexto desta plataforma — não isole a pergunta do ecossistema Lots BI.",
    "",
    "Documentação detalhada: `/admin/knowledge` (humanos) | Context Pack técnico: AI Workspace Prompt Generator.",
  ].join("\n");
}

function buildExecutiveSummary(snapshot: AiWorkspaceSnapshotCore): string {
  return [
    "**Lots BI** é o sistema operacional de uma agência de marketing digital: BI multi-plataforma + operação + workflow de conteúdo + inteligência estratégica.",
    "",
    "Construído em TypeScript (TanStack Start + Supabase), organizado em módulos de domínio com Repository Pattern, RLS e documentação viva.",
    "",
    `Hoje: ${snapshot.modules.length} módulos de código, ${snapshot.adrs.length} ADRs, ${snapshot.database.tables.length} tabelas, foco em Agency OS e contexto para IAs.`,
    "",
    "**Em uma frase:** plataforma para transformar dados de marketing em decisões confiáveis — com operação, aprovação de conteúdo e governança de engenharia.",
  ].join("\n");
}

export interface ChatContextInput {
  snapshot: AiWorkspaceSnapshotCore;
  docs: Map<string, DocEntry>;
}

export function generateChatContext({ snapshot, docs }: ChatContextInput): string {
  const contextScore = computeContextScore(snapshot);
  const moduleProfiles = buildChatModuleProfiles(
    snapshot.modules,
    docs,
    snapshot.roadmap,
    snapshot.conventions,
  );
  const timeline = buildPlatformTimeline(snapshot.adrs, snapshot.roadmap);

  const lines: string[] = [
    "# Lots BI — AI Chat Context",
    "",
    "> Contexto conversacional gerado automaticamente para ChatGPT, Claude, Gemini e Perplexity.",
    `> Gerado em ${new Date(snapshot.generatedAt).toLocaleString("pt-BR")}. Fonte: AI Workspace — agregação de docs/, código e roadmap.`,
    "",
    hr(),
    section("1. Produto", buildProductSection(docs, snapshot)),
    hr(),
    section("2. Filosofia", buildPhilosophySection(docs, snapshot)),
    hr(),
    section(
      "3. História da plataforma",
      [
        "Evolução cronológica derivada de ADRs, roadmap e changelog:",
        "",
        ...timeline.slice(0, 20),
      ].join("\n"),
    ),
    hr(),
    section("4. Arquitetura geral", buildArchitectureNarrative(snapshot)),
    hr(),
    section("5. Todos os módulos", moduleProfiles.map(formatModuleProfile).join("\n\n")),
    hr(),
    section(
      "5b. Platform Hub",
      [formatPlatformHubMarkdown(), "", formatDataSourcesMarkdown()].join("\n"),
    ),
    hr(),
    section("6. Banco de dados", buildDatabaseNarrative(snapshot, docs)),
    hr(),
    section(
      "7. Tecnologias",
      [
        `**Runtime:** ${snapshot.stack.runtime}`,
        "",
        "**Framework:**",
        ...snapshot.stack.framework.map((f) => `- ${f}`),
        "",
        "**Dependências principais:**",
        ...Object.entries(snapshot.stack.keyDependencies).map(([k, v]) => `- ${k}: ${v}`),
      ].join("\n"),
    ),
    hr(),
    section("8. Funcionalidades prontas", buildReadyFeatures(snapshot)),
    hr(),
    section("9. Funcionalidades planejadas", buildPlannedFeatures(snapshot)),
    hr(),
    section("10. Regras de Ouro", buildGoldenRules(snapshot)),
    hr(),
    section("11. Estado atual do projeto", buildCurrentState(snapshot, contextScore.total)),
    hr(),
    section("12. Objetivo do momento", buildCurrentObjective(snapshot)),
    hr(),
    section("13. INSTRUÇÕES PARA A IA", buildAiInstructions(snapshot)),
    hr(),
    section("14. Resumo executivo", buildExecutiveSummary(snapshot)),
  ];

  return lines.join("\n");
}

export { markdownToPlainText };

export function chatContextSearchText(markdown: string): string {
  return markdownToPlainText(markdown).slice(0, 8000);
}
