export interface CursorPageV1<T> {
  data: T[];
  nextCursor?: string;
}

export interface PaginateCursorOptions<T> {
  fetchPage: (cursor?: string) => Promise<CursorPageV1<T>>;
  maxPages?: number;
}

/**
 * Paginação genérica por cursor — Graph API, TikTok, Google, etc.
 * `truncated` significa que ainda havia próxima página quando o teto foi atingido.
 * Quem grava o dia inteiro não pode tratar isso como coleta completa.
 */
export async function paginateCursorPages<T>(
  options: PaginateCursorOptions<T>,
): Promise<{ items: T[]; pagesFetched: number; truncated: boolean }> {
  const maxPages = options.maxPages ?? 50;
  const items: T[] = [];
  let cursor: string | undefined;
  let pagesFetched = 0;

  while (pagesFetched < maxPages) {
    const page = await options.fetchPage(cursor);
    items.push(...page.data);
    pagesFetched += 1;
    if (!page.nextCursor) return { items, pagesFetched, truncated: false };
    cursor = page.nextCursor;
  }

  return { items, pagesFetched, truncated: true };
}
