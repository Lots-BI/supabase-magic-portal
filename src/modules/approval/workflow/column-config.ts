import type { ContentCardStatus } from "../types/content-card";
import { KANBAN_ACTIVE_STATUSES } from "../types/content-card";

export type KanbanColumnConfig = {
  status: ContentCardStatus;
  label: string;
  colorToken: string;
};

/** Colunas Kanban ativas (exclui arquivado — Biblioteca). */
export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  { status: "roteiro", label: "Roteiro", colorToken: "--cw-col-edicao" },
  {
    status: "aguardando_aprovacao",
    label: "Cliente: roteiro + mídia",
    colorToken: "--cw-col-aguardando",
  },
  {
    status: "alteracoes_roteiro",
    label: "Alterações Calendário + Roteiro",
    colorToken: "--cw-col-alteracoes",
  },
  {
    status: "aguardando_material",
    label: "Material recebido",
    colorToken: "--cw-col-aguardando",
  },
  { status: "producao", label: "Em produção", colorToken: "--cw-col-producao" },
  {
    status: "aguardando_aprovacao_final",
    label: "Aprovar publicação",
    colorToken: "--cw-col-aprovado",
  },
  {
    status: "alteracoes_design",
    label: "Alterações Design + Vídeo",
    colorToken: "--cw-col-alteracoes",
  },
  { status: "agendado", label: "Agendado", colorToken: "--cw-col-aprovado" },
  { status: "publicado", label: "Publicado", colorToken: "--cw-col-publicado" },
];

export function getColumnForStatus(status: ContentCardStatus): KanbanColumnConfig | undefined {
  return KANBAN_COLUMNS.find((col) => col.status === status);
}

export function isKanbanActiveStatus(status: ContentCardStatus): boolean {
  return KANBAN_ACTIVE_STATUSES.includes(status);
}
