import type { ContentCard, ContentCardStatus } from "../types/content-card";
import type { KanbanBoard } from "./build-kanban-board";

export const AGENCY_TURN_STATUSES: ContentCardStatus[] = [
  "roteiro",
  "alteracoes_roteiro",
  "producao",
  "alteracoes_design",
];

export const CLIENT_TURN_STATUSES: ContentCardStatus[] = [
  "aguardando_aprovacao",
  "aguardando_aprovacao_final",
];

/**
 * `aguardando_material` é vez do cliente enquanto ele não envia as mídias
 * gravadas (aprovação do roteiro não exige mídia — só depois disso o cliente
 * é cobrado a enviar). Some para a vez da agência quando o checklist
 * `material_recebido` estiver concluído.
 */
function hasMaterialReceived(card: Pick<ContentCard, "checklist">): boolean {
  return card.checklist.some((item) => item.id === "material_recebido" && item.done);
}

export type WorkflowStampId = "ideia" | "cliente_roteiro" | "peca" | "cliente_peca" | "no_ar";

export type WorkflowStamp = {
  id: WorkflowStampId;
  label: string;
  statuses: ContentCardStatus[];
};

export const WORKFLOW_STAMPS: WorkflowStamp[] = [
  { id: "ideia", label: "Ideia", statuses: ["roteiro", "alteracoes_roteiro"] },
  { id: "cliente_roteiro", label: "Cliente", statuses: ["aguardando_aprovacao"] },
  {
    id: "peca",
    label: "Peça",
    statuses: ["aguardando_material", "producao", "alteracoes_design"],
  },
  { id: "cliente_peca", label: "Cliente", statuses: ["aguardando_aprovacao_final"] },
  { id: "no_ar", label: "No ar", statuses: ["agendado", "publicado"] },
];

export type AgencyActionKind = "escrever" | "baixar" | "editar";

export type ClientRevisionFlags = { roteiro?: boolean; peca?: boolean };

/** Barrinha da fila do cliente — o que ele precisa fazer agora. */
export function clientActionLabel(
  status: ContentCardStatus,
  revision?: ClientRevisionFlags,
): string | null {
  if (status === "aguardando_aprovacao") {
    return revision?.roteiro
      ? "Aprovar Roteiro + Legenda (alterações)"
      : "Aprovar Roteiro + Legenda";
  }
  if (status === "aguardando_material") return "Enviar Material";
  if (status === "aguardando_aprovacao_final") {
    return revision?.peca ? "Aprovação Final (Alterações)" : "Aprovação Final";
  }
  return null;
}

export function clientActionBarClass(
  status: ContentCardStatus,
  revision?: ClientRevisionFlags,
): string {
  const revisao =
    (status === "aguardando_aprovacao" && revision?.roteiro) ||
    (status === "aguardando_aprovacao_final" && revision?.peca);
  if (status === "aguardando_material" || revisao) return "bg-amber-400 text-zinc-950";
  return "bg-emerald-500 text-white";
}

export function stampForStatus(status: ContentCardStatus): WorkflowStamp | null {
  return WORKFLOW_STAMPS.find((stamp) => stamp.statuses.includes(status)) ?? null;
}

export function agencyActionKind(status: ContentCardStatus): AgencyActionKind | null {
  if (status === "roteiro" || status === "alteracoes_roteiro") return "escrever";
  if (status === "aguardando_material") return "baixar";
  if (status === "producao" || status === "alteracoes_design") return "editar";
  return null;
}

export function flattenKanbanCards(board: unknown): ContentCard[] {
  if (!board || typeof board !== "object" || !("columns" in board)) return [];
  const columns = (board as KanbanBoard).columns;
  if (!Array.isArray(columns)) return [];
  return columns.flatMap((column) => column.cards ?? []);
}

function byPublishDate(a: ContentCard, b: ContentCard): number {
  const date = a.data_publicacao.localeCompare(b.data_publicacao);
  if (date !== 0) return date;
  return (a.hora_publicacao ?? "").localeCompare(b.hora_publicacao ?? "");
}

export function agencyTurnCards(cards: ContentCard[]): ContentCard[] {
  return cards
    .filter((card) => {
      if (AGENCY_TURN_STATUSES.includes(card.status)) return true;
      if (card.status === "aguardando_material") return hasMaterialReceived(card);
      return false;
    })
    .sort(byPublishDate);
}

export function clientTurnCards(cards: ContentCard[]): ContentCard[] {
  return cards
    .filter((card) => {
      if (CLIENT_TURN_STATUSES.includes(card.status)) return true;
      if (card.status === "aguardando_material") return !hasMaterialReceived(card);
      return false;
    })
    .sort(byPublishDate);
}

export function publicationDayNumber(isoDate: string): string {
  const match = isoDate.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (!match) return isoDate;
  return String(Number(match[2]));
}

/** Dia da semana e data completa em pt-BR, para exibição legível (ex.: "Quinta-feira" / "15 de outubro"). */
export function publicationFullDateLabel(isoDate: string): { weekday: string; full: string } {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return { weekday: "", full: isoDate };
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
  const full = date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  return { weekday, full };
}
