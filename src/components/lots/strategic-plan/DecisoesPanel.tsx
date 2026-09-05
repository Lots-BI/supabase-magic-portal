import type { PlanoDecisao } from "@/lib/strategic-plan/types";
import { SectionCard } from "@/components/lots/SectionCard";

export function DecisoesPanel({
  decisoes,
  title = "Decisões",
}: {
  decisoes: PlanoDecisao[];
  title?: string;
}) {
  return (
    <SectionCard
      eyebrow="Memória estratégica"
      title={title}
      description="Registro histórico de decisões — permanecem no plano contínuo."
    >
      {decisoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma decisão registrada.</p>
      ) : (
        <div className="space-y-3">
          {decisoes.map((d) => (
            <article key={d.id} className="rounded-xl border border-border p-4">
              <p className="text-sm font-semibold text-foreground">{d.titulo}</p>
              <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Motivo</dt>
                  <dd className="mt-0.5 text-foreground">{d.motivo}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Responsável</dt>
                  <dd className="mt-0.5 text-foreground">{d.responsavel_email ?? "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Resultado</dt>
                  <dd className="mt-0.5 text-foreground">
                    {d.resultado_texto ?? "Depois veremos"}
                    {d.resultado_status !== "pendente" && (
                      <span className="ml-2 text-muted-foreground">({d.resultado_status})</span>
                    )}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
