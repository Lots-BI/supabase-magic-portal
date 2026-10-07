import { Label } from "@/components/ui/label";

export function AlteracoesPedidasField({ mensagem }: { mensagem: string | null }) {
  const texto = mensagem?.trim();
  if (!texto) return null;
  return (
    <div className="space-y-2">
      <Label htmlFor="alteracoes-pedidas">Alterações pedidas</Label>
      <div
        id="alteracoes-pedidas"
        className="whitespace-pre-wrap rounded-xl border border-amber-400/50 bg-amber-400/10 px-3 py-3 text-sm leading-relaxed text-foreground"
      >
        {texto}
      </div>
    </div>
  );
}
