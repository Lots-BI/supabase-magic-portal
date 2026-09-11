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
    id: "2026-09-11-lots-runtime",
    date: "2026-09-11",
    title: "CRM: Direct no Lots, sem ManyChat",
    summary:
      "Comentários e Direct Instagram entram na caixa de entrada pela Graph. A agência não precisa de ManyChat nem n8n.",
    bullets: [
      "No CRM, **Puxar Instagram** lê comentários e conversas da conta conectada.",
      "Responder Direct na ficha da pessoa (quando houver IGSID).",
      "Para ligar Direct: caso de uso Mensagens no app Meta, Relogin da conexão.",
    ],
    audience: "all",
    tags: ["CRM", "Novidade"],
  },
  {
    id: "2026-09-11-crm-inbox",
    date: "2026-09-11",
    title: "CRM: caixa de entrada da audiência",
    summary:
      "A aba CRM passou a ser a caixa de entrada de quem falou com a marca — WhatsApp, formulário, Direct ou comentário. Sem e-mail inventado no texto.",
    bullets: [
      "Menu **Dados** → **CRM**. A lista abre em **Caixa de entrada**.",
      "A agência pode ligar um formulário do site na mesma ficha (token na tela, só admin).",
      "E-mail e telefone só entram se o canal enviar o campo — nunca extraídos da mensagem.",
    ],
    audience: "all",
    tags: ["CRM", "Novidade"],
  },
  {
    id: "2026-09-11-crm-audiencia",
    date: "2026-09-11",
    title: "CRM: quem comentou, voltou ou sumiu",
    summary:
      "A aba CRM mostra pessoas identificáveis da sua audiência — a partir dos comentários nas publicações. Sem e-mail inventado.",
    bullets: [
      "Menu **Dados** → **CRM** (acima de Relatório).",
      "Listas **Responder agora** e **Em risco**, e quais posts trazem gente de volta.",
      "E-mail e endereço só entram se um formulário de anúncio ou o WhatsApp entregar — a Graph não dá isso no comentário.",
    ],
    audience: "all",
    tags: ["CRM", "Novidade"],
  },
  {
    id: "2026-09-11-relatorio-visual",
    date: "2026-09-11",
    title: "Relatório visual: o que aconteceu, em números e gráficos",
    summary:
      "A aba Relatório da sua marca virou um canvas: uma frase do período, os números principais e gráficos. Canal sem coleta no recorte nem aparece.",
    bullets: [
      "Abra **Relatório** no menu (ou o card no hub de Dashboards) e escolha o período.",
      "Só entram plataformas ativas — sem aba vazia de Google Ads, GA4, etc.",
      "Publicações e Conteúdos aparecem só se houver peça no recorte.",
    ],
    audience: "all",
    tags: ["Relatório", "Novidade"],
  },
  {
    id: "2026-09-11-hub-ingest-overview",
    date: "2026-09-11",
    title: "Métricas Meta/Instagram de noite e visão geral mais rápida",
    summary:
      "Meta Ads e Instagram perfil passam a ser coletados pelo Hub (crons + Puxar). A Visão geral e os Relatórios do admin leem um RPC — sem timeout — e Conversões usam resultados Meta além do GA4.",
    bullets: [
      "Puxar métricas e crons noturnos no Hub; Make continua só como leftover (Google/GA4 ainda sem OAuth).",
      "Visão geral e Relatórios: números do portfólio via servidor (Ctrl+F5 se a tela antiga estiver em cache).",
      "KPI Conversões = resultados das campanhas Meta + Google + GA4 (não soma o pixel em dobro).",
    ],
    audience: "admin",
    tags: ["Platform Hub", "Visão geral", "Relatórios"],
  },
  {
    id: "2026-09-06-conteudos-aprovacao-instagram",
    date: "2026-09-06",
    title: "Conteúdos: aprovar roteiro, enviar mídias e publicar no Instagram",
    summary:
      "A aba Conteúdos agora fecha o ciclo editorial: você aprova o roteiro e envia as mídias gravadas no mesmo passo; depois aprova a peça final já com data e hora. No horário combinado, o post vai para o Instagram da sua marca.",
    bullets: [
      "Um único **Aprovar** no roteiro — anexe as mídias gravadas antes de confirmar.",
      "A peça final chega com data e hora (Brasília). Ao aprovar, ela fica agendada.",
      "O Instagram recebe o post nesse horário. Em **Publicados** você acompanha o que já saiu.",
    ],
    audience: "client",
    tags: ["Conteúdos", "Instagram", "Novidade"],
  },
  {
    id: "2026-09-06-conteudos-publish-admin",
    date: "2026-09-06",
    title: "Conteúdos: calendário, materiais e publicação Instagram no horário",
    summary:
      "Workflow editorial completo no admin: calendário e roteiro, biblioteca de originais do cliente, produção da peça final e publicação no Instagram via Graph no horário de Brasília.",
    bullets: [
      "Abas **Calendário**, **Fila**, **Materiais**, **Publicados** e **Pilares**.",
      "Baixe os originais em Materiais para ir a **Em produção**; a peça final é só do admin.",
      "Após a aprovação do cliente, o Lots agenda internamente e o job publica no Instagram.",
      "Em Conexões, **Refazer login** no Instagram do cliente para autorizar publicar (instagram_content_publish).",
    ],
    audience: "admin",
    tags: ["Conteúdos", "Instagram", "Platform Hub"],
  },
  {
    id: "2026-09-05-meta-ads-resultados",
    date: "2026-09-05",
    title: "Meta Ads agora mostra Resultados das campanhas",
    summary:
      "O dashboard Meta Ads passa a trazer a coluna Resultados do Gerenciador de Anúncios — o resultado primário de cada campanha no dia (venda, lead, mensagem, etc.).",
    bullets: [
      "Card e gráfico de **Resultados** no dashboard Meta Ads.",
      "KPI de **custo por resultado** no período.",
      "Use **Puxar métricas** de novo se algum dia ainda não tiver Resultados.",
    ],
    audience: "client",
    tags: ["Meta Ads", "Novidade"],
  },
  {
    id: "2026-09-05-conexoes-cliente-meta-ads",
    date: "2026-09-05",
    title: "Agora dá para conectar o Meta Ads sozinho também",
    summary:
      "A aba Conexões ganhou um novo card: você já podia conectar o Instagram, agora pode conectar sua conta de anúncios Meta Ads também, sem precisar da agência.",
    bullets: [
      "Mesmo menu **Conexões**, um card por plataforma.",
      "Login com sua conta do Facebook que administra a conta de anúncios.",
      "Depois de conectar, use Puxar métricas no dashboard Meta Ads.",
    ],
    audience: "client",
    tags: ["Meta Ads", "Novidade"],
  },
  {
    id: "2026-09-05-meta-ads-campanhas-hub",
    date: "2026-09-05",
    title: "Meta Ads: métricas de campanha sem dias faltantes",
    summary:
      "O dashboard Meta Ads agora pode coletar direto da Meta, preenchendo automaticamente qualquer dia sem dados dentro do histórico disponível.",
    bullets: [
      "Botão **Puxar métricas** no topo do dashboard Meta Ads, ao lado do período.",
      "Preenche dias faltantes por campanha, até 30 dias por clique.",
      "Pode ser usado várias vezes até completar todo o histórico disponível.",
    ],
    audience: "client",
    tags: ["Meta Ads", "Novidade"],
  },
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
