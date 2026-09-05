import type { PlanoEvento, StrategicAlert } from "@/lib/strategic-plan/types";
import { SectionCard } from "@/components/lots/SectionCard";
import { ActivityTimeline, type TimelineEvent } from "@/components/lots/ActivityTimeline";

const EVENT_LABEL: Record<string, string> = {
  criacao: "Criação",
  edicao: "Edição",
  comentario: "Comentário",
  conclusao: "Conclusão",
  mudanca_meta: "Meta alterada",
  mudanca_responsavel: "Responsável alterado",
  mudanca_status: "Status alterado",
  decisao: "Decisão",
  aprendizado: "Aprendizado",
  proposta_edicao: "Proposta de edição",
};

function eventToTimeline(e: PlanoEvento): TimelineEvent {
  return {
    id: e.id,
    created_at: e.created_at,
    autor_email: e.autor_email,
    label: EVENT_LABEL[e.tipo] ?? e.tipo,
    subtitle: e.entity_type ?? undefined,
    mensagem: e.mensagem,
    tone: e.tipo === "decisao" ? "primary" : e.tipo === "conclusao" ? "success" : "muted",
  };
}

export function KpisAlertsSection({
  alerts,
  metricCount,
}: {
  alerts: StrategicAlert[];
  metricCount: number;
}) {
  return (
    <SectionCard
      eyebrow="Monitoramento"
      title="KPIs e alertas"
      description={`${metricCount} KPI(s) acompanhados.`}
    >
      {alerts.length === 0 ? (
        <p className="text-sm text-[color:var(--success)]">Nenhum alerta no momento.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={
                a.severity === "danger"
                  ? "rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                  : a.severity === "warning"
                    ? "rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning"
                    : "rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
              }
            >
              {a.message}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function PlanoTimelineSection({ eventos }: { eventos: PlanoEvento[] }) {
  return (
    <SectionCard eyebrow="Histórico" title="Timeline" description="Eventos, edições e comentários.">
      {eventos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
      ) : (
        <ActivityTimeline events={eventos.map(eventToTimeline)} />
      )}
    </SectionCard>
  );
}
