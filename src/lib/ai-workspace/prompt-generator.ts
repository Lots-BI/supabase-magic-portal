import type { AiWorkspaceSnapshot } from "./types";
import { formatPlatformHubMarkdown } from "./sources/platform-hub";
import { formatDataSourcesMarkdown } from "./sources/data-sources";

function section(title: string, body: string): string {
  if (!body.trim()) return "";
  return `## ${title}\n\n${body.trim()}\n`;
}

function list(items: string[], limit = 20): string {
  return items
    .slice(0, limit)
    .map((i) => `- ${i}`)
    .join("\n");
}

export function generateContextPrompt(snapshot: AiWorkspaceSnapshot): string {
  const lines: string[] = [];

  lines.push("# Lots BI — Context Pack para IA");
  lines.push("");
  lines.push(
    `> Gerado automaticamente em ${new Date(snapshot.generatedAt).toLocaleString("pt-BR")}. Fonte: AI Workspace (agregação do repositório). Não editar manualmente — regenerar via /admin/ai-workspace.`,
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push(
    section(
      "Resumo Executivo",
      [snapshot.overview.summary, "", "**Pontos-chave:**", list(snapshot.overview.bullets, 8)].join(
        "\n",
      ),
    ),
  );

  lines.push(
    section(
      "Stack Tecnológica",
      [
        `Runtime: ${snapshot.stack.runtime}`,
        "",
        "**Framework:**",
        list(snapshot.stack.framework),
        "",
        "**Dependências principais:**",
        ...Object.entries(snapshot.stack.keyDependencies).map(([k, v]) => `- \`${k}\`: ${v}`),
      ].join("\n"),
    ),
  );

  lines.push(
    section(
      "Arquitetura",
      [
        snapshot.architecture.summary,
        "",
        "**Camadas:**",
        ...snapshot.architecture.layers.map((l) => `- **${l.name}:** ${l.description}`),
      ].join("\n"),
    ),
  );

  lines.push(
    section(
      `Módulos (${snapshot.modules.length})`,
      snapshot.modules
        .map(
          (m) =>
            `### ${m.label} (\`${m.id}\`)\n` +
            `- **Objetivo:** ${m.objective}\n` +
            `- **Responsabilidades:** ${m.responsibilities.join("; ")}\n` +
            `- **Arquivos principais:** ${m.mainFiles
              .slice(0, 6)
              .map((f) => `\`${f}\``)
              .join(", ")}\n` +
            `- **Dependências:** ${m.dependencies.join(", ")}`,
        )
        .join("\n\n"),
    ),
  );

  lines.push(
    section(
      "Fluxos Principais",
      snapshot.flows
        .map((f) => `### ${f.name}\n${f.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`)
        .join("\n\n"),
    ),
  );

  const keyTables = [
    "content_cards",
    "content_card_events",
    "editorial_pillars",
    "story_plan_rows",
    "cadastro_clientes",
    "client_access",
    "user_roles",
    "profiles",
    "base_metricas",
  ];
  const tables = snapshot.database.tables.filter(
    (t) =>
      keyTables.includes(t.name) || t.name.startsWith("agency_") || t.name.startsWith("plano_"),
  );
  const otherCount = snapshot.database.tables.length - tables.length;

  lines.push(
    section(
      "Domínio do Banco",
      [
        snapshot.database.summaryMarkdown.slice(0, 600),
        "",
        `**${snapshot.database.tables.length} tabelas** em ${snapshot.database.migrationFiles.length} migrations.`,
        "",
        "**Tabelas importantes:**",
        ...tables
          .slice(0, 15)
          .map(
            (t) =>
              `- \`${t.name}\` (${t.migration})${t.foreignKeys.length ? ` → FK: ${t.foreignKeys.join(", ")}` : ""}`,
          ),
        otherCount > 0 ? `- ... e mais ${otherCount} tabelas` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  );

  lines.push(
    section(
      "ADRs (Decisões Arquiteturais)",
      snapshot.adrs
        .map((a) => `- **${a.id}** — ${a.title} (${a.status}, ${a.date})\n  ${a.summary}`)
        .join("\n"),
    ),
  );

  lines.push(
    section(
      "Roadmap",
      [
        "### Concluído",
        list(
          snapshot.roadmap.completed.map((i) => i.text),
          10,
        ),
        "",
        "### Em andamento",
        list(
          snapshot.roadmap.inProgress.map((i) => i.text),
          10,
        ),
        "",
        "### Planejado",
        list(
          snapshot.roadmap.planned.map((i) => i.text),
          10,
        ),
      ].join("\n"),
    ),
  );

  lines.push(
    section(
      "Estado Atual & Últimas Entregas",
      [
        "### [Não lançado]",
        list(snapshot.changelog.unreleased, 15),
        "",
        "### Releases recentes",
        ...snapshot.changelog.recentReleases
          .slice(0, 3)
          .map((r) => `**${r.version}**${r.date ? ` (${r.date})` : ""}:\n${list(r.items, 5)}`),
        "",
        "### Commits recentes",
        list(
          snapshot.changelog.recentCommits.map((c) => `\`${c.hash}\` ${c.subject}`),
          10,
        ),
      ].join("\n"),
    ),
  );

  lines.push(
    section(
      "Convenções Obrigatórias",
      snapshot.conventions
        .slice(0, 15)
        .map((c) => `- **${c.title}:** ${c.description} _(${c.source})_`)
        .join("\n"),
    ),
  );

  lines.push(section("Platform Hub", formatPlatformHubMarkdown()));
  lines.push(section("Current Data Sources", formatDataSourcesMarkdown()));

  lines.push(
    section(
      "Limitações Conhecidas",
      list(
        snapshot.limitations.length
          ? snapshot.limitations
          : ["Nenhuma limitação crítica documentada."],
      ),
    ),
  );

  lines.push(
    section(
      "Objetivo Atual",
      list(
        snapshot.roadmap.inProgress.slice(0, 5).map((i) => i.text),
        5,
      ) || "- Consultar roadmap em docs/11-roadmap/roadmap.md",
    ),
  );

  lines.push(
    section(
      "Próximos Passos",
      list(
        snapshot.roadmap.planned.slice(0, 8).map((i) => i.text),
        8,
      ) || "- Consultar seções 'Próximas evoluções' no roadmap",
    ),
  );

  lines.push("---");
  lines.push("");
  lines.push(
    "**Instruções para a IA:** Use este contexto como base. O Knowledge Center em `/admin/knowledge` contém documentação técnica detalhada. ADRs em `docs/02-architecture/adr/`. Código em `lots-bi/src/`. Siga as convenções listadas acima.",
  );

  return lines.filter(Boolean).join("\n");
}

export function markdownToPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
