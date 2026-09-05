import type { IntegrationDef } from "@/lib/integrations-catalog";
import { getIntegrationStatus } from "@/lib/integrations-catalog";
import { IntegrationStatusPill } from "@/components/lots/IntegrationStatusPill";
import { Field, TextInput } from "@/components/lots/FormField";

interface IntegrationCardProps {
  integration: IntegrationDef;
  active: boolean;
  values: Record<string, string>;
  onChange: (col: string, value: string) => void;
}

export function IntegrationCard({ integration, active, values, onChange }: IntegrationCardProps) {
  const status = getIntegrationStatus(integration, values, active);
  const primary = integration.fields.find((f) => f.primary) ?? integration.fields[0];
  const primaryEmpty =
    primary && (typeof values[primary.col] !== "string" || values[primary.col].trim() === "");

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-[14px] font-semibold tracking-tight text-foreground">
            {integration.label}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {active ? "Plataforma ativa" : "Plataforma desativada"}
          </p>
        </div>
        <IntegrationStatusPill status={status} />
      </div>

      <div className="mt-3 space-y-2.5">
        {integration.fields.map((f) => (
          <Field key={f.col} label={f.label} hint={f.hint}>
            <TextInput
              value={values[f.col] ?? ""}
              onChange={(e) => onChange(f.col, e.target.value)}
              placeholder={f.placeholder}
              maxLength={200}
            />
          </Field>
        ))}
      </div>

      {active && primaryEmpty && (
        <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
          Preencha o ID para que o Make execute esta integração.
        </p>
      )}
      {!active && !primaryEmpty && (
        <p className="mt-2 text-[11px] text-sky-700 dark:text-sky-300">
          ID pré-cadastrado. Ative a plataforma para começar a coletar.
        </p>
      )}
    </div>
  );
}
