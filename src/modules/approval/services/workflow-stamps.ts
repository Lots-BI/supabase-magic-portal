import type { ContentCard, ContentCardStatus } from "../types/content-card";
import type { KanbanBoard } from "./build-kanban-board";

export const AGENCY_TURN_STATUSES: ContentCardStatus[] = [
  "roteiro",
  "alteracoes_roteiro",
  "aguardando_material",
  "producao",
  "alteracoes_design",
];

export const CLIENT_TURN_STATUSES: ContentCardStatus[] = [
  "aguardando_aprovacao",
  "aguardando_aprovacao_final",
];

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
  return cards.filter((card) => AGENCY_TURN_STATUSES.includes(card.status)).sort(byPublishDate);
}

export function clientTurnCards(cards: ContentCard[]): ContentCard[] {
  return cards.filter((card) => CLIENT_TURN_STATUSES.includes(card.status)).sort(byPublishDate);
}

export function publicationDayNumber(isoDate: string): string {
  const match = isoDate.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (!match) return isoDate;
  return String(Number(match[2]));
}
