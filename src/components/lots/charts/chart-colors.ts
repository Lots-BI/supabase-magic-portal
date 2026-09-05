import type { AreaSeriesTone } from "./AreaChartLots";

const TONE_LEGEND: Record<AreaSeriesTone, string> = {
  primary: "#A855F7",
  secondary: "#60A5FA",
  success: "#22c55e",
  neutral: "#a1a1aa",
};

/** Cor de legenda — sem importar Recharts (permite lazy load do chart). */
export function getSeriesColor(tone: AreaSeriesTone) {
  return TONE_LEGEND[tone];
}
