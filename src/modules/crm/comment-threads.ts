export type CrmThreadSource = {
  id: string;
  personId: string;
  personName: string;
  body: string | null;
  occurredAt: string;
  place: string;
  permalink: string | null;
  captionExcerpt: string | null;
  externalId: string;
  kind: "comment" | "reply" | "brand_reply";
  parentId: string | null;
  inReplyTo: string | null;
  hidden: boolean;
};

export type CrmThreadReply = {
  id: string;
  externalId: string;
  personId: string;
  personName: string;
  body: string | null;
  occurredAt: string;
  fromBrand: boolean;
  hidden: boolean;
};

export type CrmCommentThread = {
  id: string;
  externalId: string;
  personId: string;
  personName: string;
  body: string | null;
  occurredAt: string;
  place: string;
  permalink: string | null;
  captionExcerpt: string | null;
  hidden: boolean;
  /** Resposta cujo comentário pai não está no CRM (ex.: comentário da própria marca). */
  orphanReply: boolean;
  answered: boolean;
  replies: CrmThreadReply[];
};

function byTime(a: { occurredAt: string }, b: { occurredAt: string }) {
  return a.occurredAt.localeCompare(b.occurredAt);
}

/** O mesmo comentário pode existir como resposta da audiência e da marca; a marca vence. */
function dedupeByExternalId(rows: readonly CrmThreadSource[]): CrmThreadSource[] {
  const byExternal = new Map<string, CrmThreadSource>();
  for (const row of rows) {
    const current = byExternal.get(row.externalId);
    if (!current || (row.kind === "brand_reply" && current.kind !== "brand_reply")) {
      byExternal.set(row.externalId, row);
    }
  }
  return [...byExternal.values()];
}

/** Agrupa comentário de topo com respostas da audiência e da marca, como no Instagram. */
export function buildCommentThreads(
  input: readonly CrmThreadSource[],
  options: { brandName?: string } = {},
): CrmCommentThread[] {
  const brandName = options.brandName ?? "Marca";
  const rows = dedupeByExternalId(input);
  const roots = rows.filter((row) => row.kind === "comment");
  const rootIds = new Set(roots.map((row) => row.externalId));
  const replyParent = new Map<string, string>();
  for (const row of rows) {
    if (row.kind !== "comment" && row.parentId) replyParent.set(row.externalId, row.parentId);
  }

  const rootOf = (row: CrmThreadSource): string | null => {
    for (const candidate of [row.parentId, row.inReplyTo]) {
      if (!candidate) continue;
      if (rootIds.has(candidate)) return candidate;
      const grand = replyParent.get(candidate);
      if (grand && rootIds.has(grand)) return grand;
    }
    return null;
  };

  const repliesByRoot = new Map<string, CrmThreadSource[]>();
  const orphans = new Map<string, CrmThreadSource[]>();
  for (const row of rows) {
    if (row.kind === "reply" && rootOf(row) === null) {
      orphans.set(row.externalId, []);
    }
  }
  for (const row of rows) {
    if (row.kind === "comment") continue;
    const root = rootOf(row);
    if (root) {
      repliesByRoot.set(root, [...(repliesByRoot.get(root) ?? []), row]);
      continue;
    }
    if (row.kind !== "brand_reply") continue;
    const orphan = [row.inReplyTo, row.parentId].find((id) => id && orphans.has(id));
    if (orphan) orphans.get(orphan)!.push(row);
  }

  const asReply = (row: CrmThreadSource): CrmThreadReply => ({
    id: row.id,
    externalId: row.externalId,
    personId: row.personId,
    personName: row.kind === "brand_reply" ? brandName : row.personName,
    body: row.body,
    occurredAt: row.occurredAt,
    fromBrand: row.kind === "brand_reply",
    hidden: row.hidden,
  });

  const toThread = (
    root: CrmThreadSource,
    replies: CrmThreadSource[],
    orphanReply: boolean,
  ): CrmCommentThread => ({
    id: root.id,
    externalId: root.externalId,
    personId: root.personId,
    personName: root.personName,
    body: root.body,
    occurredAt: root.occurredAt,
    place: root.place,
    permalink: root.permalink,
    captionExcerpt: root.captionExcerpt,
    hidden: root.hidden,
    orphanReply,
    answered: replies.some((reply) => reply.kind === "brand_reply"),
    replies: [...replies].sort(byTime).map(asReply),
  });

  const threads = roots.map((root) =>
    toThread(root, repliesByRoot.get(root.externalId) ?? [], false),
  );
  for (const row of rows) {
    if (row.kind === "reply" && orphans.has(row.externalId)) {
      threads.push(toThread(row, orphans.get(row.externalId) ?? [], true));
    }
  }

  return threads.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
