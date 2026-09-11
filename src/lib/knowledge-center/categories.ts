/** Display labels and sort order for top-level docs folders. */
export const FOLDER_LABELS: Record<string, { label: string; order: number }> = {
  "00-company": { label: "Empresa", order: 0 },
  "01-product": { label: "Produto", order: 10 },
  "02-architecture": { label: "Arquitetura", order: 20 },
  "03-backend": { label: "Backend", order: 40 },
  "04-database": { label: "Banco de Dados", order: 30 },
  "05-frontend": { label: "Frontend", order: 35 },
  "06-dashboards": { label: "Dashboards", order: 50 },
  "06-engine": { label: "Engenharia", order: 60 },
  "07-integrations": { label: "Integrações", order: 45 },
  "08-operations": { label: "Operações", order: 70 },
  "09-standards": { label: "Padrões", order: 65 },
  "10-onboarding": { label: "Onboarding", order: 80 },
  "11-roadmap": { label: "Roadmap", order: 15 },
  "12-changelog": { label: "Changelog", order: 16 },
  "13-platform-hub": { label: "Platform Hub", order: 42 },
  "13-execution": { label: "Plano do agente", order: 96 },
  reports: { label: "Relatórios técnicos", order: 90 },
};

export const ROOT_DOC_LABELS: Record<string, { label: string; order: number }> = {
  "start-here": { label: "Comece aqui", order: -10 },
  readme: { label: "Índice do Handbook", order: -5 },
};

/** Slugs hidden from sidebar (still reachable via search/direct URL). */
export const HIDDEN_SLUGS = new Set(["audit", "AUDIT"]);

export function labelForSegment(segment: string): string {
  return (
    FOLDER_LABELS[segment]?.label ??
    segment
      .replace(/^\d+-/, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function orderForSegment(segment: string): number {
  return FOLDER_LABELS[segment]?.order ?? 100;
}
