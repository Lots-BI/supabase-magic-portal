import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Legenda da publicação — bloco grande, para ler e copiar sem esforço. */
export function CaptionPanel({
  value,
  editable = false,
  onChange,
  placeholder = "Texto que vai na publicação",
}: {
  value: string;
  editable?: boolean;
  onChange?: (value: string) => void;
  placeholder?: string;
}) {
  const [copied, setCopied] = useState(false);
  const trimmed = value.trim();

  async function handleCopy() {
    if (!trimmed) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Legenda copiada.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <article className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Legenda
        </p>
        {trimmed ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1.5 px-2 text-xs"
            onClick={() => void handleCopy()}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            Copiar
          </Button>
        ) : null}
      </div>
      {editable ? (
        <Textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "mt-4 min-h-[36vh] resize-y border-0 bg-transparent p-0 text-xl leading-relaxed shadow-none focus-visible:ring-0 sm:text-2xl",
          )}
        />
      ) : trimmed ? (
        <p className="mt-4 whitespace-pre-wrap text-xl leading-relaxed sm:text-2xl">{value}</p>
      ) : (
        <p className="mt-4 text-lg text-muted-foreground">Sem legenda ainda.</p>
      )}
    </article>
  );
}
