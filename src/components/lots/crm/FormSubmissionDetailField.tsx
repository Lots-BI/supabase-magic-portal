// Lots BI · CRM — peças de UI compartilhadas entre a aba "Formulários" (CRM)
// e a Central de Leads para exibir o detalhe de um envio de formulário.
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function FormDetailField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="break-words text-sm text-foreground">{value}</p>
    </div>
  );
}

export function FormCopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 px-2"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        toast.success(`${label} copiado.`);
      }}
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}
