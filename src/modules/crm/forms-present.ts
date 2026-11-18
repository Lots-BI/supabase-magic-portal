// Lots BI · CRM — formatação compartilhada de envios de formulário
// (landing + formulário instantâneo da Meta). Usado pela aba "Formulários"
// do CRM e pela Central de Leads — fonte única para não duplicar regras de
// exibição de data/contato entre as duas telas.

/** Data/hora curta em pt-BR, ex.: "18 nov, 14:32". */
export function formatFormWhen(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Tempo relativo, ex.: "há 3 h". Cai para `formatFormWhen` se a data for inválida ou futura. */
export function formatFormAgo(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(delta) || delta < 0) return formatFormWhen(iso);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

/** Linha "e-mail · @instagram · telefone" com os contatos estruturados disponíveis. */
export function formSubmissionContactLine(row: {
  email: string | null;
  instagram: string | null;
  telefone: string | null;
}): string {
  const parts: string[] = [];
  if (row.email) parts.push(row.email);
  if (row.instagram) parts.push(`@${row.instagram.replace(/^@/, "")}`);
  if (row.telefone) parts.push(row.telefone);
  return parts.join(" · ");
}
