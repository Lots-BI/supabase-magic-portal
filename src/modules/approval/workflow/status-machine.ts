import type { ContentCardStatus } from "../types/content-card";

/** Transições permitidas no workflow (admin/social_media). Cliente usa subset via permissions. */
const ALLOWED_TRANSITIONS: Record<ContentCardStatus, ContentCardStatus[]> = {
  roteiro: ["aguardando_aprovacao", "arquivado"],
  aguardando_aprovacao: ["aguardando_material", "alteracoes_roteiro", "roteiro", "arquivado"],
  alteracoes_roteiro: ["aguardando_aprovacao", "roteiro", "arquivado"],
  aguardando_material: ["producao", "arquivado"],
  producao: ["aguardando_aprovacao_final", "arquivado"],
  aguardando_aprovacao_final: ["agendado", "alteracoes_design", "producao", "arquivado"],
  alteracoes_design: ["aguardando_aprovacao_final", "producao", "arquivado"],
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
  if (
    from === "aguardando_aprovacao" &&
    (to === "aguardando_material" || to === "alteracoes_roteiro")
  ) {
    return true;
  }
  if (from === "aguardando_aprovacao_final" && (to === "agendado" || to === "alteracoes_design")) {
    return true;
  }
  return from === to;
}

export function isRoteiroWorkspaceStatus(status: ContentCardStatus): boolean {
  return status === "roteiro" || status === "alteracoes_roteiro";
}

export function isProducaoWorkspaceStatus(status: ContentCardStatus): boolean {
  return status === "producao" || status === "alteracoes_design";
}
