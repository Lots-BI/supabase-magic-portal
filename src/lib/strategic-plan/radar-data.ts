// Lots BI · Radar executivo — eixos normalizados com peso das estratégias.

import { PLATFORM_REGISTRY } from "@/lib/platforms/registry";
import type { MetricRefProgress, PlanoEstrategia, RadarAxis } from "./types";

export function buildRadarAxes(input: {
  metricProgress: MetricRefProgress[];
  estrategias: PlanoEstrategia[];
}): RadarAxis[] {
  const byPlatform = new Map<string, { sum: number; count: number; peso: number }>();

  for (const m of input.metricProgress) {
    const key = m.ref.platform_key;
    const pct = m.pct ?? (m.onTrack ? 100 : 50);
    const cur = byPlatform.get(key) ?? { sum: 0, count: 0, peso: 0 };
    cur.sum += Math.min(100, Math.max(0, pct));
    cur.count += 1;
    byPlatform.set(key, cur);
  }

  for (const e of input.estrategias) {
    const title = e.titulo.toLowerCase();
    for (const [pKey, def] of Object.entries(PLATFORM_REGISTRY)) {
      if (title.includes(def.label.toLowerCase()) || title.includes(pKey.replace("_", " "))) {
        const cur = byPlatform.get(pKey) ?? { sum: 0, count: 0, peso: 0 };
        cur.peso = Math.max(cur.peso, e.peso_percentual);
        if (cur.count === 0) {
          cur.sum = e.status === "concluido" ? 100 : e.status === "em_andamento" ? 60 : 30;
          cur.count = 1;
        }
        byPlatform.set(pKey, cur);
      }
    }
  }

  const axes: RadarAxis[] = [];
  for (const [key, data] of byPlatform) {
    const def = PLATFORM_REGISTRY[key];
    const value = data.count > 0 ? data.sum / data.count : 0;
    axes.push({
      label: def?.label ?? key,
      value: Math.round(value),
      peso: data.peso || 10,
    });
  }

  if (axes.length === 0) {
    for (const e of input.estrategias.slice(0, 6)) {
      axes.push({
        label: e.titulo.slice(0, 20),
        value: e.status === "concluido" ? 100 : e.status === "em_andamento" ? 65 : 35,
        peso: e.peso_percentual || 10,
      });
    }
  }

  return axes.sort((a, b) => b.peso - a.peso);
}

export function barFill(value: number, max = 7): string {
  const filled = Math.round((value / 100) * max);
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, max - filled));
}
