// ============================================================================
// Utilitários de data — America/Sao_Paulo (UTC-3, sem horário de verão desde
// 2019). Usados pelo graph client (bounds do dia em Unix) e pelo serviço de
// sync de perfil (hoje/ontem, enumeração de dias, aritmética de datas).
// ============================================================================

const SP_UTC_OFFSET_HOURS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Data atual (YYYY-MM-DD) no fuso America/Sao_Paulo. */
export function todayInSaoPaulo(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Soma (ou subtrai) dias a uma data YYYY-MM-DD, preservando o formato. */
export function addDaysToDateStr(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d) + delta * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Lista de datas YYYY-MM-DD entre `from` e `to`, inclusive (ordem crescente). */
export function enumerateDatesInclusive(from: string, to: string): string[] {
  const dates: string[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 400) {
    dates.push(cursor);
    cursor = addDaysToDateStr(cursor, 1);
    guard += 1;
  }
  return dates;
}

/**
 * Limites Unix (segundos) do dia `date` em America/Sao_Paulo — usados em
 * since/until de Instagram Insights (período diário, metric_type=total_value).
 */
export function spDayBoundsUnixSeconds(date: string): { sinceUnix: number; untilUnix: number } {
  const [y, m, d] = date.split("-").map(Number);
  const sinceMs = Date.UTC(y, m - 1, d, SP_UTC_OFFSET_HOURS, 0, 0);
  return {
    sinceUnix: Math.floor(sinceMs / 1000),
    untilUnix: Math.floor((sinceMs + MS_PER_DAY) / 1000),
  };
}
