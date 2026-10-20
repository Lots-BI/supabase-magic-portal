import type { Row } from "./types";

/**
 * Ordem igual à do coletor: a primeira métrica gravada que bate com
 * `results` naquele dia/campanha é a que o Gerenciador usou como Resultado.
 */
export const RESULT_SOURCE_KEYS = [
  "messaging_conversations_started",
  "conversions",
  "instagram_profile_follows",
  "landing_page_views",
  "inline_link_clicks",
  "link_clicks",
  "video_views",
] as const;

export const OBJECTIVE_RESULT_KEY = "objective";

export const OBJECTIVE_RESULT_DESCRIPTION =
  "Parcela da coluna Resultados do Gerenciador que, no mesmo dia e na mesma campanha, não coincidiu com conversas, conversões, seguidores, cliques no link, página de destino ou vídeo de 3 segundos. É o número oficial do objetivo da campanha (compra, lead, engajamento ou visualização) quando a coleta ainda não guardou o nome exato desse objetivo.";

export const TOTAL_RESULTS_DESCRIPTION =
  "Soma da coluna Resultados do Gerenciador no período. Cada campanha conta o resultado do próprio objetivo, então o total pode misturar métricas diferentes. A lista separa o que deu para identificar.";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function attributeResultSource(row: Row): string {
  for (const key of RESULT_SOURCE_KEYS) {
    if (num(row[`rk_${key}`]) > 0) return key;
  }
  if (num(row.rk_objective) > 0) return OBJECTIVE_RESULT_KEY;

  const results = num(row.results);
  if (results <= 0) return "";
  for (const key of RESULT_SOURCE_KEYS) {
    if (num(row[key]) === results) return key;
  }
  return OBJECTIVE_RESULT_KEY;
}

export interface ResultSlice {
  key: string;
  current: number;
  previous: number;
}

function taggedParts(row: Row): Array<{ key: string; value: number }> {
  const parts: Array<{ key: string; value: number }> = [];
  for (const key of RESULT_SOURCE_KEYS) {
    const value = num(row[`rk_${key}`]);
    if (value > 0) parts.push({ key, value });
  }
  const objective = num(row.rk_objective);
  if (objective > 0) parts.push({ key: OBJECTIVE_RESULT_KEY, value: objective });
  if (parts.length > 0) return parts;

  const source = attributeResultSource(row);
  const results = num(row.results);
  if (!source || results <= 0) return [];
  return [{ key: source, value: results }];
}

export function summarizeResultSources(
  rows: Row[],
  current: { from: string; to: string },
  previous: { from: string; to: string },
): ResultSlice[] {
  const totals = new Map<string, ResultSlice>();

  const add = (key: string, value: number, side: "current" | "previous") => {
    if (!key || value <= 0) return;
    const slice = totals.get(key) ?? { key, current: 0, previous: 0 };
    slice[side] += value;
    totals.set(key, slice);
  };

  for (const row of rows) {
    const side =
      row.data >= current.from && row.data <= current.to
        ? "current"
        : row.data >= previous.from && row.data <= previous.to
          ? "previous"
          : "";
    if (!side) continue;
    for (const part of taggedParts(row)) add(part.key, part.value, side);
  }

  return [...totals.values()]
    .filter((slice) => slice.current > 0 || slice.previous > 0)
    .sort((a, b) => b.current - a.current || b.previous - a.previous);
}
