/**
 * Novidades da plataforma — visíveis em /novidades (clientes e admins).
 *
 * Após cada deploy com feature visível ao cliente:
 * 1. Adicione um item no topo de PLATFORM_RELEASES (mais recente primeiro).
 * 2. Atualize docs/12-changelog/changelog.md (mesmo PR).
 * 3. Se necessário, capítulo do tutorial em src/content/platform-tutorial/client/.
 */

export type PlatformReleaseAudience = "client" | "admin" | "all";

export type PlatformReleaseItem = {
  id: string;
  date: string;
  title: string;
  summary: string;
  bullets?: string[];
  audience: PlatformReleaseAudience;
  tags?: string[];
};

export const PLATFORM_RELEASES: PlatformReleaseItem[] = [
  {
    id: "2026-09-01-instagram-publicacoes",
    date: "2026-09-01",
    title: "Publicações Instagram — métricas por post",
    summary:
      "Nova área para acompanhar cada publicação (Feed, Reels, Carrossel e Stories) com miniaturas e métricas de desempenho, no estilo de ferramentas profissionais de social.",
    bullets: [
      "Menu **Publicações** dentro do painel da sua marca (quando Instagram está conectado).",
      "Visualize alcance, engajamento, curtidas, comentários e salvamentos por post.",
      "Use **Puxar métricas** para atualizar os dados quando quiser (com intervalo mínimo entre syncs).",
    ],
    audience: "client",
    tags: ["Instagram", "Novidade"],
  },
  {
    id: "2026-09-01-hub-instagram-admin",
    date: "2026-09-01",
    title: "Conexão Instagram orgânico no Platform Hub",
    summary:
      "Administradores podem conectar contas Instagram Business via OAuth Meta, escolher o perfil e sincronizar publicações para o dashboard do cliente.",
    bullets: [
      "Assistente em **Conexões → Nova conexão** com login Meta em janela dedicada.",
      "Plugin `instagram_organic` com scopes de insights oficiais.",
      "Sync manual na conexão ou pelo cliente em Publicações.",
    ],
    audience: "admin",
    tags: ["Platform Hub", "Instagram"],
  },
];
