import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Target, ArrowRight } from "lucide-react";
import { upsertObjetivo } from "@/lib/strategic-plan.functions";
import { SectionCard } from "@/components/lots/SectionCard";
import { Field, TextInput, TextArea } from "@/components/lots/FormField";
import { Button } from "@/components/ui/button";
import { brtToday, addDaysISO } from "@/lib/period";

export function PrimeiroObjetivoOnboarding({
  planoId,
  clienteNome,
  onComplete,
}: {
  planoId: string;
  clienteNome: string;
  onComplete?: () => void;
}) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertObjetivo);
  const [step, setStep] = useState(1);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [meta, setMeta] = useState("");
  const [dataAlvo, setDataAlvo] = useState(addDaysISO(brtToday(), 89));

  const mut = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          plano_id: planoId,
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          meta_numerica: meta ? Number(meta) : null,
          data_alvo: dataAlvo,
          workflow_fase: "em_andamento",
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["strategic-dashboard", planoId] });
      onComplete?.();
    },
  });

  return (
    <SectionCard
      title="Vamos definir o primeiro objetivo estratégico"
      description={`Este é o ponto de partida do planejamento contínuo de ${clienteNome}.`}
    >
      <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <span className={step >= 1 ? "font-semibold text-primary" : ""}>1. Objetivo</span>
        <ArrowRight className="h-3 w-3" />
        <span className={step >= 2 ? "font-semibold text-primary" : ""}>2. Meta e prazo</span>
        <ArrowRight className="h-3 w-3" />
        <span className={step >= 3 ? "font-semibold text-primary" : ""}>3. Confirmar</span>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <Field
            label="Título do objetivo"
            required
            hint="O que este cliente precisa alcançar agora? Seja específico e mensurável."
          >
            <TextInput
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Aumentar leads qualificados em 30%"
            />
          </Field>
          <Field label="Descrição" hint="Contexto, hipótese inicial ou critério de sucesso.">
            <TextArea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Ex.: Foco em Meta Ads e landing otimizada para o segmento B2B."
            />
          </Field>
          <Button size="sm" disabled={!titulo.trim()} onClick={() => setStep(2)}>
            Continuar
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <Field label="Meta numérica (opcional)" hint="Valor alvo associado ao objetivo.">
            <TextInput
              type="number"
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
              placeholder="Ex.: 150"
            />
          </Field>
          <Field label="Prazo" hint="Data alvo para conclusão deste objetivo.">
            <TextInput type="date" value={dataAlvo} onChange={(e) => setDataAlvo(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button size="sm" onClick={() => setStep(3)}>
              Revisar
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg border border-border p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-foreground">{titulo}</p>
              {descricao && <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                {meta ? `Meta: ${meta} · ` : ""}
                Prazo: {new Date(dataAlvo + "T12:00:00").toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(2)}>
              Voltar
            </Button>
            <Button size="sm" disabled={mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? "Salvando…" : "Iniciar objetivo"}
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export function ProximoObjetivoPrompt({
  planoId,
  onStart,
}: {
  planoId: string;
  onStart: () => void;
}) {
  return (
    <SectionCard
      title="Objetivo concluído — qual é o próximo?"
      description="O Plano Estratégico continua o mesmo. Defina o próximo objetivo para manter a evolução."
    >
      <Button size="sm" className="gap-1.5" onClick={onStart}>
        <Target className="h-3.5 w-3.5" />
        Criar próximo objetivo
      </Button>
    </SectionCard>
  );
}
