import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import type { RadarAxis } from "@/lib/strategic-plan/types";
import { barFill } from "@/lib/strategic-plan/radar-data";
import { SectionCard } from "@/components/lots/SectionCard";

export function StrategicRadarChart({ axes }: { axes: RadarAxis[] }) {
  const data = axes.map((a) => ({
    subject: a.label,
    value: Math.round(a.value * (a.peso / 100 || 0.1)),
    fullMark: 100,
    peso: a.peso,
  }));

  return (
    <SectionCard
      eyebrow="Visão executiva"
      title="Radar Estratégico"
      description="Progresso por canal, ponderado pelo peso das estratégias."
    >
      {axes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Adicione estratégias e KPIs para o radar.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="w-full min-w-0" style={{ height: "clamp(220px, 55vw, 280px)" }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <Radar
                  name="Progresso"
                  dataKey="value"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-3">
            {axes.map((a) => (
              <li key={a.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{a.label}</span>
                  <span className="text-muted-foreground">{a.peso.toFixed(0)}% peso</span>
                </div>
                <p className="mt-1 font-mono text-[11px] tracking-wider text-primary">
                  {barFill(a.value)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
