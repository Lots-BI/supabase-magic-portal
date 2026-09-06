export type MetaManagedPage = {
  id: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: { id: string; username?: string };
};

export type PagePublishToken = {
  accessToken: string;
  pageId: string;
  igUserId: string;
};

/** Escolhe o token da Página ligada ao Instagram profissional — exigido pela Meta no Facebook Login. */
export function selectPagePublishToken(
  pages: MetaManagedPage[],
  igUserId: string,
  fallbackPageId?: string | null,
): PagePublishToken {
  const byIg = pages.find((page) => page.instagram_business_account?.id === igUserId);
  const byPage = fallbackPageId
    ? pages.find((page) => page.id === fallbackPageId)
    : undefined;
  const match = byIg ?? byPage;
  if (!match) {
    throw new Error(
      "missing_connection: Esta conta Meta não tem a Página ligada a esse Instagram. Reconecte com a conta que gerencia o portfólio do cliente.",
    );
  }
  if (!match.access_token) {
    throw new Error(
      "missing_publish_scope: Reconecte o Instagram em Conexões para obter o token da Página (pages_manage_posts).",
    );
  }
  return {
    accessToken: match.access_token,
    pageId: match.id,
    igUserId: byIg?.instagram_business_account?.id ?? igUserId,
  };
}
