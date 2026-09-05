import { Field, Select } from "@/components/lots/FormField";
import type { AgencyClientCard } from "@/modules/agency-os";

export type ClientPickerOption = Pick<AgencyClientCard, "id" | "nome_cliente" | "empresa">;

export function ClientPicker({
  clients,
  value,
  onChange,
  required,
}: {
  clients: ClientPickerOption[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <Field label="Cliente" required={required}>
      <Select value={value} onChange={(e) => onChange(e.target.value)} required={required}>
        <option value="">Selecione…</option>
        {clients.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.nome_cliente}
            {c.empresa ? ` · ${c.empresa}` : ""}
          </option>
        ))}
      </Select>
    </Field>
  );
}
