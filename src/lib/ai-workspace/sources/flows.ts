import type { DocEntry } from "@/lib/knowledge-center/types";
import type { FlowDefinition } from "../types";
import { extractSection, stripMarkdownInline } from "../extractors/markdown-sections";

const FLOW_DEFINITIONS: Array<{
  id: string;
  name: string;
  sourceSlug: string;
  section?: string;
  fallbackSteps: string[];
}> = [
  {
    id: "client-onboarding",
    name: "Cadastro e acesso de cliente",
    sourceSlug: "03-backend/auth-module-v3",
    fallbackSteps: [
      "Cadastro de cliente",
      "Criação de usuário",
      "Convite",
      "Definição de senha",
      "Acesso ao portal",
      "Dashboard",
    ],
  },
  {
    id: "content-workflow",
    name: "Workflow de conteúdo",
    sourceSlug: "02-architecture/content-workflow",
    fallbackSteps: [
      "Pilar editorial",
      "Card",
      "Produção",
      "Edição",
      "Aguardando aprovação",
      "Aprovado",
      "Publicado",
      "Biblioteca",
    ],
  },
  {
    id: "data-pipeline",
    name: "Pipeline de métricas (Make — produção)",
    sourceSlug: "02-architecture/data-flow",
    fallbackSteps: [
      "APIs de Marketing",
      "Make (ingestão)",
      "base_metricas",
      "Views SQL",
      "Engine TypeScript",
      "Dashboard",
    ],
  },
  {
    id: "dashboard-reading",
    name: "Leitura dos dashboards",
    sourceSlug: "06-dashboards/dashboards",
    fallbackSteps: [
      "Cards do template (Pulso por padrão)",
      "Editar visualização — recortes e template próprio",
      "Ranking de campanhas com todas as métricas",
      "Expansão = coleta diária das mesmas colunas",
      "Estrutura Meta: conjunto, anúncio, turbinação",
    ],
  },
  {
    id: "platform-hub-metrics",
    name: "Pipeline de métricas (Platform Hub)",
    sourceSlug: "02-architecture/engineering-contracts",
    fallbackSteps: [
      "Provider (OfficialMeta / MakePassive)",
      "IngestEnvelope metrics-timeseries",
      "MetricPipeline + normalizers",
      "MetricWriterPort (memory / supabase flag)",
      "Baseline Reader vs Make (paridade)",
      "Health via integration.* events",
    ],
  },
];

export function buildFlows(docs: Map<string, DocEntry>): FlowDefinition[] {
  return FLOW_DEFINITIONS.map((def) => {
    const doc = docs.get(def.sourceSlug);
    let steps = def.fallbackSteps;

    if (doc) {
      const statusLine = doc.body.match(/Status:\s*`([^`]+)`(?:\s*→\s*`([^`]+)`)+/i);
      if (statusLine) {
        steps =
          doc.body
            .match(/`([a-z_]+)`/g)
            ?.map((s) => s.replace(/`/g, "").replace(/_/g, " "))
            .slice(0, 8) ?? steps;
      }

      const arrowFlow = doc.body
        .split("\n")
        .find((l) => l.includes("→") && !l.startsWith("|") && !l.startsWith("```"));
      if (arrowFlow) {
        const parsed = arrowFlow
          .split(/→|->/)
          .map((s) => stripMarkdownInline(s))
          .filter((s) => s.length > 2 && s.length < 60);
        if (parsed.length >= 3) steps = parsed;
      }

      if (def.section) {
        const section = extractSection(doc.body, def.section);
        const listSteps = section
          .split("\n")
          .filter((l) => l.match(/^\d+\./))
          .map((l) => stripMarkdownInline(l.replace(/^\d+\.\s*/, "")))
          .filter(Boolean);
        if (listSteps.length >= 3) steps = listSteps;
      }
    }

    return {
      id: def.id,
      name: def.name,
      steps,
      sourceSlug: def.sourceSlug,
    };
  });
}
