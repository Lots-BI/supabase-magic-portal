import type { ValueFormat } from "@/lib/platforms/types";

const intFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const decFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const brlCents = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

export function formatReportValue(format: ValueFormat, value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  switch (format) {
    case "currency":
      return Math.abs(value) < 100 ? brlCents.format(value) : brl.format(value);
    case "percent":
      return `${value.toFixed(1)}%`;
    case "decimal":
      return decFmt.format(value);
    case "int":
    default:
      return intFmt.format(Math.round(value));
  }
}

export function formatDeltaPct(delta: number | null): string {
  if (delta == null || !Number.isFinite(delta)) return "—";
  const abs = Math.abs(delta).toFixed(0);
  return delta >= 0 ? `+${abs}%` : `−${abs}%`;
}
