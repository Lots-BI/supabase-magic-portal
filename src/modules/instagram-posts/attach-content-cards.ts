import type { ContentCardStatus } from "@/modules/approval/types/content-card";
import type { IgContentCardLink, IgMediaRow } from "./types";

export type ContentCardAttachRow = {
  id: string;
  titulo: string;
  formato: string | null;
  linha_editorial: string | null;
  tema: string | null;
  cta: string | null;
  pilar_id: string | null;
  status: string;
  data_publicacao: string;
  hora_publicacao: string | null;
  tags: string[] | null;
  roteiro: string | null;
  copy_text: string | null;
  legenda: string | null;
  external_post_id: string | null;
};

export function editorialExcerpt(
  htmlOrText: string | null | undefined,
  max = 180,
): string | null {
  if (!htmlOrText) return null;
  const plain = htmlOrText
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return null;
  if (plain.length <= max) return plain;
  return `${plain.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function mapContentCardLink(
  card: ContentCardAttachRow,
  pilarTitulo: string | null,
): IgContentCardLink {
  return {
    id: card.id,
    titulo: card.titulo,
    formato: card.formato,
    linhaEditorial: card.linha_editorial,
    tema: card.tema,
    cta: card.cta,
    pilarTitulo,
    status: card.status as ContentCardStatus,
    dataPublicacao: card.data_publicacao,
    horaPublicacao: card.hora_publicacao,
    tags: card.tags,
    excerpt: editorialExcerpt(card.roteiro || card.copy_text || card.legenda),
  };
}

export function attachContentCardsToPosts(
  posts: IgMediaRow[],
  cards: ContentCardAttachRow[],
  pillarsById: Record<string, string>,
): IgMediaRow[] {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const byExternal = new Map<string, ContentCardAttachRow>();
  for (const card of cards) {
    if (card.external_post_id) byExternal.set(card.external_post_id, card);
  }

  return posts.map((post) => {
    const raw =
      (post.content_card_id ? byId.get(post.content_card_id) : undefined) ??
      byExternal.get(post.ig_media_id) ??
      null;
    if (!raw) return post;
    const pilarTitulo = raw.pilar_id ? (pillarsById[raw.pilar_id] ?? null) : null;
    return {
      ...post,
      content_card_id: post.content_card_id ?? raw.id,
      contentCard: mapContentCardLink(raw, pilarTitulo),
    };
  });
}
