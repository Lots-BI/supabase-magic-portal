import type { ContentCardStatus } from "../types/content-card";

/** Transições permitidas no workflow (admin/social_media). Cliente usa subset via permissions. */
const ALLOWED_TRANSITIONS: Record<ContentCardStatus, ContentCardStatus[]> = {
  roteiro: ["aguardando_aprovacao", "arquivado"],
  aguardando_aprovacao: ["aguardando_material", "roteiro", "arquivado"],
  aguardando_material: ["producao", "arquivado"],
  producao: ["aguardando_aprovacao_final", "arquivado"],
  aguardando_aprovacao_final: ["agendado", "producao", "arquivado"],
  agendado: ["publicado", "producao", "arquivado"],
  publicado: ["arquivado"],
  arquivado: [],
  edicao: ["producao", "aguardando_aprovacao", "arquivado"],
  aprovado: ["agendado", "publicado", "arquivado"],
};

export function canTransitionStatus(from: ContentCardStatus, to: ContentCardStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertValidTransition(from: ContentCardStatus, to: ContentCardStatus): void {
  if (!canTransitionStatus(from, to)) {
    throw new Error(`Transição de status inválida: ${from} → ${to}`);
  }
}

/** Transições permitidas para cliente (aprovação). */
export function canClientTransitionStatus(from: ContentCardStatus, to: ContentCardStatus): boolean {
  if (from === "aguardando_aprovacao" && (to === "aguardando_material" || to === "roteiro")) {
    return true;
  }
  if (from === "aguardando_aprovacao_final" && (to === "agendado" || to === "producao")) {
    return true;
  }
  return from === to;
}
