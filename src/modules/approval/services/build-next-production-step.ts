import type { ChecklistItem, ContentCard, ContentFormato } from "../types/content-card";
import type { ContentCardAttachment } from "../types/content-card-attachment";

export type ProductionNextStep = {
  id: string;
  title: string;
  body: string;
};

const MEDIA_COPY: Record<ContentFormato, { title: string; body: string }> = {
  reels: {
    title: "Anexe a mídia final",
    body: "Envie o vídeo vertical do Reels (MP4).",
  },
  estatico: {
    title: "Anexe a imagem final",
    body: "Envie a arte em JPG ou PNG.",
  },
  carrossel: {
    title: "Anexe as imagens do carrossel",
    body: "Envie pelo menos 2 imagens na ordem de publicação.",
  },
};

export function buildNextProductionStep(
  card: Pick<ContentCard, "formato" | "checklist">,
): ProductionNextStep | null {
  const pending = card.checklist.find((c) => c.required !== false && !c.done);
  if (!pending) return null;

  if (pending.id === "media_final") {
    const f = (card.formato ?? "estatico") as ContentFormato;
    const copy = MEDIA_COPY[f] ?? MEDIA_COPY.estatico;
    return { id: pending.id, title: copy.title, body: copy.body };
  }

  if (pending.id === "legenda_cta") {
    return {
      id: pending.id,
      title: "Escreva a legenda",
      body: "Texto que aparece na publicação. CTA opcional no campo abaixo.",
    };
  }

  if (pending.id === "preview_ok") {
    return {
      id: pending.id,
      title: "Revise o preview",
      body: "Confira como ficará no Instagram e marque como revisado.",
    };
  }

  return {
    id: pending.id,
    title: pending.label,
    body: "Conclua este item para avançar.",
  };
}

const POST_ROTEIRO_STATUSES = new Set([
  "aguardando_material",
  "producao",
  "aguardando_aprovacao_final",
  "agendado",
  "publicado",
]);

export function syncAutoChecklist(
  card: Pick<ContentCard, "status" | "formato" | "legenda" | "checklist">,
  attachments: Pick<ContentCardAttachment, "media_role" | "kind">[],
): ChecklistItem[] {
  const finals = attachments.filter((a) => a.media_role === "final");
  const hasMaterial = attachments.some((a) => a.media_role === "cliente_material");
  const formato = (card.formato ?? "estatico") as ContentFormato;

  let mediaDone = false;
  if (formato === "carrossel") {
    mediaDone = finals.filter((a) => a.kind === "image").length >= 2;
  } else if (formato === "reels") {
    mediaDone = finals.some((a) => a.kind === "video");
  } else {
    mediaDone = finals.some((a) => a.kind === "image" || a.kind === "video");
  }

  const legendaDone = Boolean(card.legenda?.trim());
  const roteiroOk = POST_ROTEIRO_STATUSES.has(card.status);

  return card.checklist.map((c) => {
    if (c.id === "material_recebido") return { ...c, done: hasMaterial || c.done };
    if (c.id === "roteiro_aprovado") return { ...c, done: roteiroOk || c.done };
    if (c.id === "media_final") return { ...c, done: mediaDone };
    if (c.id === "legenda_cta") return { ...c, done: legendaDone };
    return c;
  });
}

export function requiredChecklistPending(checklist: ChecklistItem[]): ChecklistItem[] {
  return checklist.filter((c) => c.required !== false && !c.done);
}
