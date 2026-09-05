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
    id: "2026-09-05-conexoes-cliente-instagram",
    date: "2026-09-05",
    title: "Conecte o Instagram sozinho, direto do seu painel",
    summary:
      "Nova aba Conexões: agora você mesmo pode autorizar o acesso ao seu Instagram, sem precisar pedir para a agência.",
    bullets: [
      "Menu **Conexões**, no painel da sua marca.",
      "Login com sua conta do Facebook/Instagram em uma janela dedicada.",
      "Por enquanto disponível para Instagram (publicações e insights de perfil).",
    ],
    audience: "client",
    tags: ["Instagram", "Novidade"],
  },
  {
    id: "2026-09-05-instagram-perfil-hub",
    date: "2026-09-05",
    title: "Instagram: métricas de perfil sem dias faltantes",
    summary:
      "O dashboard Instagram (perfil) agora pode coletar direto da Meta, preenchendo automaticamente qualquer dia sem dados dentro do histórico disponível.",
    bullets: [
      "Botão **Puxar métricas** no topo do dashboard Instagram, ao lado do período.",
      "Preenche dias faltantes dos últimos ~90 dias (limite da própria Meta).",
      "Pode ser usado várias vezes até completar todo o histórico disponível.",
    ],
    audience: "client",
    tags: ["Instagram", "Novidade"],
  },
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
