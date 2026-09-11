import { normalizeIdentityValue } from "./normalize-identity";
import type { CrmFieldKey } from "./types";

export type ExportIdentity = { kind: string; value: string };
export type ExportFact = { field: string; value: string };

export type CrmExportRow = {
  person_id: string;
  display_name: string;
  ig_username: string;
  first_seen: string;
  last_seen: string;
  intent_score: number;
  churn_state: string;
  email: string;
  phone: string;
};

function factValue(facts: readonly ExportFact[], field: CrmFieldKey): string {
  const row = facts.find((f) => f.field === field);
  if (!row) return "";
  return row.value.trim();
}

/** E-mail/telefone só de `crm_field_facts`. Nunca do texto do comentário. */
export function toExportRow(input: {
  personId: string;
  displayName: string;
  firstSeen: string | null;
  lastSeen: string | null;
  intentScore: number;
  churnState: string;
  identities: readonly ExportIdentity[];
  facts: readonly ExportFact[];
}): CrmExportRow {
  const ig = input.identities.find((i) => i.kind === "ig_username");
  return {
    person_id: input.personId,
    display_name: input.displayName,
    ig_username: ig ? (normalizeIdentityValue("ig_username", ig.value) ?? "") : "",
    first_seen: input.firstSeen ?? "",
    last_seen: input.lastSeen ?? "",
    intent_score: input.intentScore,
    churn_state: input.churnState,
    email: factValue(input.facts, "email"),
    phone: factValue(input.facts, "phone"),
  };
}

const CSV_COLUMNS: (keyof CrmExportRow)[] = [
  "person_id",
  "display_name",
  "ig_username",
  "first_seen",
  "last_seen",
  "intent_score",
  "churn_state",
  "email",
  "phone",
];

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: readonly CrmExportRow[]): string {
  const header = CSV_COLUMNS.join(",");
  const body = rows.map((row) => CSV_COLUMNS.map((col) => csvCell(row[col])).join(","));
  return [header, ...body].join("\n");
}
