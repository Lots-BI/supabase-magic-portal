/** Catálogo de linhas editoriais — opções de criação de conteúdo. */

export type LinhaEditorialItem = {
  /** Valor persistido em `content_cards.linha_editorial` */
  value: string;
  /** Descrição curta para orientar a escolha */
  description: string;
};

export type LinhaEditorialCategory = {
  id: string;
  label: string;
  items: readonly LinhaEditorialItem[];
};

export const LINHAS_EDITORIAIS_CATEGORIES = [
  {
    id: "educacional",
    label: "Educacional e Técnico (Autoridade)",
    items: [
      {
        value: "Tutoriais / Passo a passo (How-to)",
        description: "Instruções sequenciais para realizar uma tarefa.",
      },
      {
        value: "Dicas rápidas e Hacks",
        description: "Atalhos ou soluções práticas para o dia a dia do público.",
      },
      {
        value: "Mitos vs. Verdades",
        description: "Desmistificação de crenças comuns do seu nicho.",
      },
      {
        value: "Glossário / Dicionário",
        description: "Explicação de termos técnicos para iniciantes.",
      },
      {
        value: "Análise de Casos / Breakdown",
        description:
          'Desconstrução de um caso real (ex: "Por que a estratégia da marca X funcionou?").',
      },
      {
        value: "Erros comuns",
        description: "O que o público está fazendo de errado e como consertar.",
      },
      {
        value: "Checklists e Ferramentas",
        description: "Listas de verificação ou indicação de apps, livros e softwares.",
      },
      {
        value: "Curiosidades históricas ou científicas",
        description: "Fatos desconhecidos sobre a sua área.",
      },
      {
        value: "Resenhas (Reviews) técnicas",
        description: "Avaliação aprofundada de um produto, serviço ou método.",
      },
    ],
  },
  {
    id: "entretenimento",
    label: "Entretenimento (Retenção e Viralização)",
    items: [
      {
        value: "Memes adaptados",
        description: "Humor genérico da internet traduzido para as dores do seu nicho.",
      },
      {
        value: "Trends de Áudio/Dança",
        description: "Participação em formatos virais do TikTok/Reels com o seu contexto.",
      },
      {
        value: "POV (Point of View)",
        description:
          "Esquetes simulando uma situação sob a perspectiva do cliente ou do profissional.",
      },
      {
        value: "Reacts",
        description:
          "Reagir a vídeos bizarros, impressionantes ou errados dentro da sua área de atuação.",
      },
      {
        value: "Paródias e Sátiras",
        description: "Exagero cômico de situações cotidianas do mercado.",
      },
      {
        value: "Gamificação",
        description: 'Caça-palavras, "pare a tela", quizzes e enquetes lúdicas.',
      },
    ],
  },
  {
    id: "conexao",
    label: "Conexão e Humanização (Relacionamento)",
    items: [
      {
        value: "Bastidores (Behind the Scenes)",
        description: "O processo de fabricação, os erros de gravação ou a bagunça do escritório.",
      },
      {
        value: "Rotina (Day in the Life / GRWM)",
        description: 'Vlogs de um dia na vida ou "Arrume-se comigo" contextualizado.',
      },
      {
        value: "Storytelling Pessoal",
        description: "A história de como você começou, seus desafios e motivações.",
      },
      {
        value: "Vulnerabilidade",
        description: "Compartilhar fracassos, tropeços ou medos reais (gera alta identificação).",
      },
      {
        value: "Opiniões Impopulares (Unpopular Opinions)",
        description: "Posicionamentos polêmicos ou contraintuitivos sobre o seu mercado.",
      },
      {
        value: "Q&A (Perguntas e Respostas)",
        description: "Caixinhas de perguntas diretas com a audiência.",
      },
      {
        value: "Batalhas de Opinião",
        description:
          'Pedir para o público escolher entre "A ou B" (ex: "Café ou Chá?", "Trabalho remoto ou Presencial?").',
      },
    ],
  },
  {
    id: "prova_social",
    label: "Prova Social e Autoridade (Validação)",
    items: [
      {
        value: "Depoimentos (Testimonials)",
        description: "Clientes relatando a experiência com você.",
      },
      {
        value: "Antes e Depois",
        description: "A transformação visual ou de métricas gerada pelo seu trabalho.",
      },
      {
        value: "Estudos de Caso de Sucesso",
        description: "Narrativa detalhada de como um cliente saiu do ponto A ao ponto B.",
      },
      {
        value: "Marcos e Métricas",
        description: 'Comemoração de números (ex: "10 mil alunos", "1 tonelada reciclada").',
      },
      {
        value: "Certificações e Premiações",
        description: "Exibição de diplomas, troféus ou selos de qualidade.",
      },
      {
        value: "Collabs e Entrevistas",
        description: "Associação de imagem ao aparecer junto com outras autoridades do mercado.",
      },
    ],
  },
  {
    id: "comercial",
    label: "Comercial e Fundo de Funil (Conversão)",
    items: [
      {
        value: "Pitch Direto",
        description: "Apresentação clara do produto, preço e link de compra.",
      },
      {
        value: "Demonstração / Unboxing",
        description: "Mostrar o produto sendo aberto ou usado na prática.",
      },
      {
        value: "Comparativos de Produto",
        description: "Seu produto vs. Concorrência (focando nos seus diferenciais).",
      },
      {
        value: "Quebra de Objeções (FAQ de Vendas)",
        description:
          'Responder ativamente aos motivos que impedem a compra (ex: "É caro?", "Tem garantia?").',
      },
      {
        value: "Escassez e Urgência",
        description: 'Contagem regressiva, "últimas vagas", "só até meia-noite".',
      },
      {
        value: "Teaser de Lançamento",
        description: "Antecipação (spoilers) de um produto que será lançado em breve.",
      },
      {
        value: "Promoções e Cupons",
        description:
          "Ações promocionais de curto prazo, relâmpago ou sazonais (Black Friday).",
      },
    ],
  },
  {
    id: "noticioso",
    label: "Noticioso e Atualidades (Relevância)",
    items: [
      {
        value: "Newsjacking",
        description:
          "Pegar carona em uma notícia bombástica do momento para explicar algo do seu nicho.",
      },
      {
        value: "Atualizações de Mercado",
        description: "Informar sobre novas leis, tecnologias ou mudanças no seu setor.",
      },
      {
        value: "Previsões e Tendências (Trendcasting)",
        description: "Apostas do que vai funcionar no próximo ano ou semestre.",
      },
      {
        value: "Clipping / Resumo da Semana",
        description: "Um compilado das notícias mais importantes dos últimos dias.",
      },
      {
        value: "Cobertura de Eventos",
        description:
          "Mostrar o que está acontecendo em feiras, congressos e palestras do setor ao vivo.",
      },
    ],
  },
  {
    id: "institucional",
    label: "Institucional e de Cultura (Branding)",
    items: [
      {
        value: "Manifesto da Marca",
        description: "Vídeos ou textos poéticos sobre no que a marca acredita.",
      },
      {
        value: "Cultura Interna",
        description: "Como a equipe se relaciona, festas da empresa, rituais de trabalho.",
      },
      {
        value: "Employer Branding / Vagas",
        description: "Conteúdo focado em atrair talentos para trabalhar na empresa.",
      },
      {
        value: "Ações ESG",
        description:
          "Mostrar iniciativas de sustentabilidade, diversidade, inclusão e impacto social.",
      },
      {
        value: "Apresentação do Time",
        description: "Dar rosto e nome aos funcionários que fazem a empresa girar.",
      },
      {
        value: "História da Empresa (Linha do Tempo)",
        description: "Como a empresa cresceu ao longo dos anos.",
      },
    ],
  },
  {
    id: "inspiracional",
    label: "Inspiracional e Aspiracional (Desejo)",
    items: [
      {
        value: "Citações (Quotes)",
        description: "Frases de impacto de líderes, filósofos ou do próprio criador.",
      },
      {
        value: "Lifestyle (Estilo de Vida)",
        description:
          "Mostrar o estilo de vida que o seu produto/serviço permite alcançar (viagens, carros, liberdade de tempo, saúde).",
      },
      {
        value: "Histórias de Superação",
        description: "Narrativas emocionantes sobre vencer obstáculos difíceis.",
      },
      {
        value: "Motivação Diária",
        description:
          "Reflexões matinais ou mensagens de incentivo para a rotina da audiência.",
      },
    ],
  },
  {
    id: "ugc",
    label: "Conteúdo Gerado pelo Usuário (Comunidade / UGC)",
    items: [
      {
        value: "Repost de Clientes (UGC)",
        description: "Compartilhar fotos e vídeos espontâneos de clientes usando o produto.",
      },
      {
        value: "Desafios para a Comunidade",
        description: "Propor que os seguidores criem algo usando uma hashtag específica.",
      },
      {
        value: "Spotlight / Destaque do Membro",
        description:
          "Contar a história de um seguidor ou aluno destaque da sua comunidade.",
      },
      {
        value: "Reviews Orgânicos",
        description:
          "Prints de comentários elogiosos deixados no Google, site ou redes sociais.",
      },
    ],
  },
] as const satisfies readonly LinhaEditorialCategory[];

/** Lista plana dos valores (compatível com selects simples). */
export const LINHAS_EDITORIAIS = LINHAS_EDITORIAIS_CATEGORIES.flatMap((c) =>
  c.items.map((i) => i.value),
);

/** @deprecated Use LINHAS_EDITORIAIS */
export const LINHAS_EDITORIAIS_PLACEHOLDER = LINHAS_EDITORIAIS;

export type LinhaEditorialValue = (typeof LINHAS_EDITORIAIS)[number];

export function findLinhaEditorial(value: string | null | undefined): LinhaEditorialItem | null {
  if (!value) return null;
  for (const cat of LINHAS_EDITORIAIS_CATEGORIES) {
    const found = cat.items.find((i) => i.value === value);
    if (found) return found;
  }
  return null;
}
