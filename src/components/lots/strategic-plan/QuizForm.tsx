import { useState } from "react";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import type { QuizData, QuizObjetivoPrincipal } from "@/lib/strategic-plan/types";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { Field, TextArea, TextInput, Select } from "@/components/lots/FormField";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OBJETIVO_LABELS: Record<QuizObjetivoPrincipal, string> = {
  vendas: "Vendas",
  branding: "Branding",
  leads: "Captação de Leads",
};

const STEPS = [
  { id: 1, label: "Momento" },
  { id: 2, label: "Estrutura" },
  { id: 3, label: "Investimento" },
] as const;

type QuizFormState = {
  momentoNegocio: string;
  objetivoPrincipal: QuizObjetivoPrincipal | "";
  temSite: "sim" | "nao" | "";
  temDominio: "sim" | "nao" | "";
  investeTrafego: "sim" | "nao" | "";
  posicionamentoRedes: string;
  verbaAdsMensal: string;
  cienteCustosInfra: boolean;
};

type FieldErrors = Partial<Record<keyof QuizFormState | "form", string>>;

const INITIAL: QuizFormState = {
  momentoNegocio: "",
  objetivoPrincipal: "",
  temSite: "",
  temDominio: "",
  investeTrafego: "",
  posicionamentoRedes: "",
  verbaAdsMensal: "",
  cienteCustosInfra: false,
};

function validateStep(step: number, form: QuizFormState): FieldErrors {
  const errors: FieldErrors = {};
  if (step === 1) {
    if (form.momentoNegocio.trim().length < 20) {
      errors.momentoNegocio = "Descreva o momento do negócio com pelo menos 20 caracteres.";
    }
    if (!form.objetivoPrincipal) {
      errors.objetivoPrincipal = "Selecione o objetivo principal.";
    }
  }
  if (step === 2) {
    if (!form.temSite) errors.temSite = "Informe se já possui site.";
    if (!form.temDominio) errors.temDominio = "Informe se já possui domínio.";
    if (!form.investeTrafego) errors.investeTrafego = "Informe se já investe em tráfego.";
    if (form.posicionamentoRedes.trim().length < 10) {
      errors.posicionamentoRedes = "Descreva o posicionamento nas redes (mín. 10 caracteres).";
    }
  }
  if (step === 3) {
    if (!form.verbaAdsMensal.trim()) {
      errors.verbaAdsMensal = "Informe a verba disponível para ads.";
    }
    if (!form.cienteCustosInfra) {
      errors.cienteCustosInfra = "Confirme que está ciente dos custos de infraestrutura.";
    }
  }
  return errors;
}

function toQuizData(form: QuizFormState): QuizData {
  return {
    momentoNegocio: form.momentoNegocio.trim(),
    objetivoPrincipal: form.objetivoPrincipal as QuizObjetivoPrincipal,
    temSite: form.temSite === "sim",
    temDominio: form.temDominio === "sim",
    investeTrafego: form.investeTrafego === "sim",
    posicionamentoRedes: form.posicionamentoRedes.trim(),
    verbaAdsMensal: form.verbaAdsMensal.trim(),
    cienteCustosInfra: true,
  };
}

export function QuizForm({
  clienteNome,
  submitting,
  onSubmit,
}: {
  clienteNome: string;
  submitting?: boolean;
  onSubmit: (data: QuizData) => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<QuizFormState>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});

  const setField = <K extends keyof QuizFormState>(key: K, value: QuizFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  };

  const goNext = () => {
    const stepErrors = validateStep(step, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(3, s + 1));
  };

  const handleSubmit = () => {
    const stepErrors = validateStep(3, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    onSubmit(toQuizData(form));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Plano Estratégico"
        title="Questionário de Alinhamento"
        description={`Vamos entender o momento de ${clienteNome} para construir um plano unificado de Social Media, Tráfego e Desenvolvimento.`}
      />

      <div className="flex items-center gap-2 px-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                step >= s.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {s.id}
            </div>
            <span
              className={cn(
                "hidden text-xs sm:inline",
                step >= s.id ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1",
                  step > s.id ? "bg-primary/40" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>

      <SectionCard
        title={
          step === 1
            ? "Momento do Negócio"
            : step === 2
              ? "Estrutura Atual"
              : "Expectativa de Investimento"
        }
        description={
          step === 1
            ? "Contexto atual e objetivo principal."
            : step === 2
              ? "Site, tráfego e redes sociais."
              : "Verba de mídia e custos de infraestrutura."
        }
      >
        <div className="space-y-4">
          {step === 1 && (
            <>
              <Field
                label="Como a empresa está hoje?"
                required
                error={errors.momentoNegocio}
                hint="Resumo breve do momento atual e do desafio principal."
              >
                <TextArea
                  value={form.momentoNegocio}
                  onChange={(e) => setField("momentoNegocio", e.target.value)}
                  rows={4}
                  placeholder="Ex.: Estamos estabilizando as vendas online e queremos melhorar a conversão do funil de tráfego pago…"
                />
              </Field>
              <Field label="Objetivo principal" required error={errors.objetivoPrincipal}>
                <Select
                  value={form.objetivoPrincipal}
                  onChange={(e) =>
                    setField("objetivoPrincipal", e.target.value as QuizObjetivoPrincipal | "")
                  }
                >
                  <option value="">Selecione…</option>
                  {(Object.keys(OBJETIVO_LABELS) as QuizObjetivoPrincipal[]).map((k) => (
                    <option key={k} value={k}>
                      {OBJETIVO_LABELS[k]}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Já possui site?" required error={errors.temSite}>
                  <Select
                    value={form.temSite}
                    onChange={(e) => setField("temSite", e.target.value as "sim" | "nao" | "")}
                  >
                    <option value="">Selecione…</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </Select>
                </Field>
                <Field label="Já possui domínio?" required error={errors.temDominio}>
                  <Select
                    value={form.temDominio}
                    onChange={(e) => setField("temDominio", e.target.value as "sim" | "nao" | "")}
                  >
                    <option value="">Selecione…</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </Select>
                </Field>
                <Field label="Já investe em tráfego?" required error={errors.investeTrafego}>
                  <Select
                    value={form.investeTrafego}
                    onChange={(e) =>
                      setField("investeTrafego", e.target.value as "sim" | "nao" | "")
                    }
                  >
                    <option value="">Selecione…</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </Select>
                </Field>
              </div>
              <Field
                label="Como está o posicionamento nas redes?"
                required
                error={errors.posicionamentoRedes}
              >
                <TextArea
                  value={form.posicionamentoRedes}
                  onChange={(e) => setField("posicionamentoRedes", e.target.value)}
                  rows={3}
                  placeholder="Ex.: Publicamos 3x/semana no Instagram, poucos Reels, engajamento irregular…"
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field
                label="Verba disponível para Google / Meta Ads"
                required
                error={errors.verbaAdsMensal}
                hint="Pode ser uma faixa (ex.: R$ 3.000–5.000 / mês)."
              >
                <TextInput
                  value={form.verbaAdsMensal}
                  onChange={(e) => setField("verbaAdsMensal", e.target.value)}
                  placeholder="Ex.: R$ 4.000 / mês"
                />
              </Field>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border"
                  checked={form.cienteCustosInfra}
                  onChange={(e) => setField("cienteCustosInfra", e.target.checked)}
                />
                <span className="text-sm text-foreground">
                  Estou ciente de que domínio, hospedagem e outras infraestruturas podem ter
                  custos adicionais fora do fee da agência.
                  {errors.cienteCustosInfra && (
                    <span className="mt-1 block text-[11.5px] text-destructive">
                      {errors.cienteCustosInfra}
                    </span>
                  )}
                </span>
              </label>
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setStep((s) => s - 1)}
                disabled={submitting}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </Button>
            ) : (
              <span />
            )}

            {step < 3 ? (
              <Button type="button" size="sm" className="gap-1.5" onClick={goNext}>
                Continuar
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={submitting}
                onClick={handleSubmit}
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? "Enviando…" : "Enviar Alinhamento"}
              </Button>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
