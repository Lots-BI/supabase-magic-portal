import { Compass, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/lots/PageHeader";

export function PendingPlan({ clienteNome }: { clienteNome: string }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10 blur-2xl" />
        <div className="lots-surface relative flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <Compass className="h-8 w-8 text-primary animate-[spin_12s_linear_infinite]" />
          <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-primary/70" />
        </div>
      </div>

      <PageHeader
        className="items-center text-center [&_p]:mx-auto [&_p]:max-w-md"
        eyebrow="Plano Estratégico"
        title="Criando seu plano"
        description={`Recebemos as informações de ${clienteNome}.`}
      />

      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Recebemos suas informações! Nossa equipe está analisando seu momento atual e construindo
        um Plano Estratégico sob medida. Você será notificado assim que o escopo estiver pronto
        para aprovação.
      </p>

      <div className="mt-10 flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
      </div>
    </div>
  );
}
