// ============================================================================
// Lots BI · período global com fuso America/Sao_Paulo
// Fonte única de verdade para QUALQUER cálculo de janela temporal na UI.
// NUNCA usar `new Date().toISOString()` para derivar "hoje" — esse caminho
// produz o dia UTC, o que desloca o último dia (entre 21:00 e 23:59 BRT).
// ============================================================================

export const APP_TZ = "America/Sao_Paulo";

const _isoDayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Retorna o dia atual em BRT no formato "YYYY-MM-DD". */
export function brtToday(d: Date = new Date()): string {
  // en-CA emite "YYYY-MM-DD".
  return _isoDayFmt.format(d);
}

/** Soma `n` dias a uma data ISO date-only. Não sofre influência de timezone. */
export function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** Diferença em dias (to - from), ambos inclusivos -> use +1 quando contar período. */
export function diffDaysISO(from: string, to: string): number {
  const [ay, am, ad] = from.split("-").map(Number);
  const [by, bm, bd] = to.split("-").map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((b - a) / 86_400_000);
}

/** Último dia do mês para um par (ano, mes 1-12). */
function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

export type PeriodPreset =
  | "today"
  | "yesterday"
  | "last_7"
  | "last_30"
  | "last_90"
  | "this_month"
  | "last_month"
  | "custom";

export interface Period {
  preset: PeriodPreset;
  /** "YYYY-MM-DD" inclusivo */
  from: string;
  /** "YYYY-MM-DD" inclusivo */
  to: string;
  /** Janela anterior do MESMO comprimento, para comparação. */
  prevFrom: string;
  prevTo: string;
  /** Quantidade de dias do período atual (inclusive). */
  days: number;
  /** Rótulo legível, sempre em pt-BR. */
  label: string;
}

export interface PeriodInput {
  preset: PeriodPreset;
  customFrom?: string;
  customTo?: string;
}

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_7", label: "Últimos 7 dias" },
  { value: "last_30", label: "Últimos 30 dias" },
  { value: "last_90", label: "Últimos 90 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
  { value: "custom", label: "Personalizado" },
];

const PRESET_LABEL: Record<PeriodPreset, string> = Object.fromEntries(
  PERIOD_PRESETS.map((p) => [p.value, p.label]),
) as Record<PeriodPreset, string>;

export function resolvePeriod(input: PeriodInput, refToday?: string): Period {
  const today = refToday ?? brtToday();
  const yesterday = addDaysISO(today, -1);

  let from: string;
  let to: string;

  switch (input.preset) {
    case "today":
      from = today;
      to = today;
      break;
    case "yesterday":
      from = yesterday;
      to = yesterday;
      break;
    case "last_7":
      from = addDaysISO(today, -6);
      to = today;
      break;
    case "last_30":
      from = addDaysISO(today, -29);
      to = today;
      break;
    case "last_90":
      from = addDaysISO(today, -89);
      to = today;
      break;
    case "this_month": {
      from = today.slice(0, 7) + "-01";
      to = today;
      break;
    }
    case "last_month": {
      const [yStr, mStr] = today.split("-");
      const y = Number(yStr);
      const m = Number(mStr);
      const lm = m === 1 ? 12 : m - 1;
      const ly = m === 1 ? y - 1 : y;
      const mm = String(lm).padStart(2, "0");
      from = `${ly}-${mm}-01`;
      to = `${ly}-${mm}-${String(lastDayOfMonth(ly, lm)).padStart(2, "0")}`;
      break;
    }
    case "custom": {
      from = input.customFrom || today;
      to = input.customTo || today;
      if (from > to) {
        const tmp = from;
        from = to;
        to = tmp;
      }
      break;
    }
    default:
      from = today;
      to = today;
  }

  const days = diffDaysISO(from, to) + 1;
  const prevTo = addDaysISO(from, -1);
  const prevFrom = addDaysISO(prevTo, -(days - 1));

  const label =
    input.preset === "custom" ? `${formatBR(from)} – ${formatBR(to)}` : PRESET_LABEL[input.preset];

  return { preset: input.preset, from, to, prevFrom, prevTo, days, label };
}

/** Formata "YYYY-MM-DD" como "dd/MM/yyyy". */
export function formatBR(iso: string): string {
  if (!iso || iso.length < 10) return iso ?? "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Curto "dd/MM" para eixos de gráfico. */
export function formatBRShort(iso: string): string {
  if (!iso || iso.length < 10) return iso ?? "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
