import type { TaskSheetAba } from "./tasks-sheet";

export type PendenciaLado = "admin" | "cliente";

export type PendenciaDraft = {
  chave: string;
  titulo: string;
  cadastroClienteId: number | null;
  clienteNome: string;
  responsavelUserId: string | null;
  responsavelNome: string | null;
  /** Quem recebe o aviso, quando não é o proprietário da coluna. */
  avisoUserId: string | null;
  /** A linha de admin também aparece para o cliente da marca. */
  visivelCliente: boolean;
  /** A data de entrega não anda de novo a cada sincronização. */
  entregaFixa: boolean;
  entrega: string;
  aba: TaskSheetAba;
  lado: PendenciaLado;
  href: string;
};

export type PendenciaCard = {
  id: string;
  status: string;
  titulo: string;
  cadastroClienteId: number;
  clienteNome: string;
  slug: string;
  dataPublicacao: string;
  checklist: unknown;
  responsavelUserId: string | null;
  responsavelEmail: string | null;
  publishError: string | null;
  publishStatus: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
  publishAttemptedAt?: string | null;
  permalink?: string | null;
};

export type PendenciaCliente = {
  id: number;
  nome: string;
  slug: string;
  ativo: boolean;
  dataInicio: string | null;
  responsavelUserId: string | null;
  instagramAtivo: boolean;
  tiktokAtivo: boolean;
  metaAtivo: boolean;
  googleAdsAtivo: boolean;
  ga4Ativo: boolean;
  googleBusinessAtivo: boolean;
};

export type PendenciaConexao = {
  id: string;
  cadastroId: number;
  pluginKey: string;
  healthStatus: string | null;
  status: string | null;
  lastSyncAt: string | null;
  tokenExpiresAt?: string | null;
  needsReauth?: boolean;
};

export type PendenciaPessoa = {
  id: string;
  cadastroClienteId: number;
  nome: string;
  slug: string;
  lastKind: string | null;
  ignoredAt: string | null;
  churnState: string | null;
  intentScore: number | null;
};

export type PendenciaDono = { userId: string; nome: string };

/** Conteúdos e Diretrizes da Marca. As outras áreas de admin ficam com a operação. */
export const DONO_CONTEUDO_EMAIL = "friessrafa@gmail.com";
export const DONO_OPERACAO_EMAIL = "leandromajr@gmail.com";

const ABAS_CONTEUDO = new Set<TaskSheetAba>(["conteudos", "diretrizes"]);

export function emailDonoAdmin(aba: TaskSheetAba): string {
  return ABAS_CONTEUDO.has(aba) ? DONO_CONTEUDO_EMAIL : DONO_OPERACAO_EMAIL;
}

export type PendenciaInput = {
  today: string;
  cards: readonly PendenciaCard[];
  clientes: readonly PendenciaCliente[];
  conexoes: readonly PendenciaConexao[];
  pessoas: readonly PendenciaPessoa[];
  diretrizesIds: ReadonlySet<number>;
  clienteUsuario: ReadonlyMap<number, { userId: string; nome: string }>;
  usuarioNome: ReadonlyMap<string, string>;
  donosPorEmail?: ReadonlyMap<string, PendenciaDono>;
  pedidos?: readonly { id: string; nome: string; criadoEm: string }[];
  /** Chaves `cadastro:semana` que já têm análise enviada. */
  analisesEnviadas?: ReadonlySet<string>;
  quedas?: readonly {
    cadastroClienteId: number;
    periodoInicio: string;
    periodoFim: string;
    registrada: boolean;
  }[];
};

const REDES: { key: string; label: string; flag: keyof PendenciaCliente }[] = [
  { key: "instagram_organic", label: "Instagram", flag: "instagramAtivo" },
  { key: "meta_ads", label: "Meta Ads", flag: "metaAtivo" },
  { key: "google_ads", label: "Google Ads", flag: "googleAdsAtivo" },
  { key: "ga4", label: "GA4", flag: "ga4Ativo" },
  { key: "google_business", label: "Google Business", flag: "googleBusinessAtivo" },
  { key: "tiktok", label: "TikTok", flag: "tiktokAtivo" },
];

export function materialRecebido(checklist: unknown): boolean {
  if (!Array.isArray(checklist)) return false;
  return checklist.some(
    (item) =>
      !!item &&
      typeof item === "object" &&
      (item as { id?: string; done?: boolean }).id === "material_recebido" &&
      (item as { done?: boolean }).done === true,
  );
}

function adminCardHref(status: string, cardId: string): string {
  if (status === "roteiro" || status === "alteracoes_roteiro") {
    return `/admin/aprovacoes/roteiro/${cardId}`;
  }
  if (status === "producao" || status === "alteracoes_design" || status === "aguardando_material") {
    return `/admin/aprovacoes/producao/${cardId}`;
  }
  return `/admin/aprovacoes/agendar/${cardId}`;
}

function clientCardHref(slug: string, cardId: string): string {
  if (slug) return `/cliente/${slug}/aprovacoes?card=${cardId}`;
  return `/aprovacoes?card=${cardId}`;
}

function dia(iso: string | null | undefined, fallback: string): string {
  const day = iso?.slice(0, 10) ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : fallback;
}

function shiftDays(iso: string, days: number): string {
  const day = dia(iso, "");
  if (!day) return iso;
  const [year, month, date] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, date));
  utc.setUTCDate(utc.getUTCDate() + days);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function mondayDaSemana(today: string): string {
  const [year, month, date] = today.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, date));
  const weekday = utc.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return shiftDays(today, delta);
}

function horasDesde(iso: string | null, today: string): number | null {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  const [year, month, date] = today.split("-").map(Number);
  const fim = Date.UTC(year, month - 1, date, 15, 0, 0);
  return (fim - time) / 36e5;
}

function donoDe(aba: TaskSheetAba, donos: ReadonlyMap<string, PendenciaDono> | undefined) {
  if (!donos) return null;
  return donos.get(emailDonoAdmin(aba)) ?? null;
}

function linha(
  item: Omit<PendenciaDraft, "avisoUserId" | "visivelCliente" | "entregaFixa"> &
    Partial<Pick<PendenciaDraft, "avisoUserId" | "visivelCliente" | "entregaFixa">>,
): PendenciaDraft {
  return {
    avisoUserId: null,
    visivelCliente: false,
    entregaFixa: false,
    ...item,
  };
}

export function buildLotsPendencias(input: PendenciaInput): PendenciaDraft[] {
  const itens: PendenciaDraft[] = [];
  const clientes = new Map(input.clientes.map((cliente) => [cliente.id, cliente]));
  const rafa = donoDe("conteudos", input.donosPorEmail);
  const leandro = donoDe("crm", input.donosPorEmail);

  for (const card of input.cards) {
    const cliente = clientes.get(card.cadastroClienteId);
    if (cliente && !cliente.ativo) continue;
    const acesso = input.clienteUsuario.get(card.cadastroClienteId);
    const publicacao = dia(card.dataPublicacao, input.today);
    const atualizado = dia(card.updatedAt, input.today);
    const marca = {
      cadastroClienteId: card.cadastroClienteId,
      clienteNome: card.clienteNome,
    };
    const daRafa = {
      responsavelUserId: rafa?.userId ?? null,
      responsavelNome: rafa?.nome ?? null,
    };
    const doCliente = {
      responsavelUserId: acesso?.userId ?? null,
      responsavelNome: acesso?.nome ?? "Cliente",
    };

    if (card.status === "publicado") {
      const publicado = dia(card.publishedAt || card.dataPublicacao, "");
      if (publicado === input.today) {
        itens.push(
          linha({
            ...marca,
            ...daRafa,
            chave: `card:${card.id}:ver-publicado`,
            titulo: `Ver o que foi publicado: ${card.titulo}`,
            entrega: publicado,
            aba: "conteudos",
            lado: "admin",
            href: card.permalink || adminCardHref("agendado", card.id),
          }),
        );
      }
      continue;
    }

    if (card.status === "roteiro") {
      itens.push(
        linha({
          ...marca,
          ...daRafa,
          chave: `card:${card.id}:roteiro`,
          titulo: `Escrever o roteiro: ${card.titulo}`,
          entrega: publicacao,
          aba: "conteudos",
          lado: "admin",
          href: adminCardHref(card.status, card.id),
        }),
      );
    } else if (card.status === "alteracoes_roteiro") {
      itens.push(
        linha({
          ...marca,
          ...daRafa,
          chave: `card:${card.id}:ajuste-roteiro`,
          titulo: `Ajustar o roteiro: ${card.titulo}`,
          entrega: publicacao,
          aba: "conteudos",
          lado: "admin",
          href: adminCardHref(card.status, card.id),
        }),
      );
    } else if (card.status === "aguardando_material" && materialRecebido(card.checklist)) {
      itens.push(
        linha({
          ...marca,
          ...daRafa,
          chave: `card:${card.id}:baixar-material`,
          titulo: `Baixar o material: ${card.titulo}`,
          entrega: atualizado,
          entregaFixa: true,
          aba: "conteudos",
          lado: "admin",
          href: `/admin/aprovacoes?tab=biblioteca&cliente=${card.cadastroClienteId}&card=${card.id}`,
        }),
      );
    } else if (card.status === "aguardando_material") {
      itens.push(
        linha({
          ...marca,
          ...doCliente,
          chave: `card:${card.id}:enviar-midias`,
          titulo: `Enviar as mídias: ${card.titulo}`,
          entrega: shiftDays(publicacao, -7),
          aba: "conteudos",
          lado: "cliente",
          href: clientCardHref(card.slug, card.id),
        }),
      );
    } else if (card.status === "producao") {
      itens.push(
        linha({
          ...marca,
          ...daRafa,
          chave: `card:${card.id}:montar`,
          titulo: `Montar a peça: ${card.titulo}`,
          entrega: publicacao,
          aba: "conteudos",
          lado: "admin",
          href: adminCardHref(card.status, card.id),
        }),
      );
    } else if (card.status === "alteracoes_design") {
      itens.push(
        linha({
          ...marca,
          ...daRafa,
          chave: `card:${card.id}:ajuste-design`,
          titulo: `Ajustar o design: ${card.titulo}`,
          entrega: shiftDays(atualizado, 3),
          entregaFixa: true,
          aba: "conteudos",
          lado: "admin",
          href: adminCardHref(card.status, card.id),
        }),
      );
    } else if (card.status === "aguardando_aprovacao") {
      itens.push(
        linha({
          ...marca,
          ...doCliente,
          chave: `card:${card.id}:aprovar-roteiro`,
          titulo: `Aprovar o roteiro: ${card.titulo}`,
          entrega: shiftDays(publicacao, -7),
          aba: "conteudos",
          lado: "cliente",
          href: clientCardHref(card.slug, card.id),
        }),
      );
    } else if (card.status === "aguardando_aprovacao_final") {
      itens.push(
        linha({
          ...marca,
          ...doCliente,
          chave: `card:${card.id}:aprovar-peca`,
          titulo: `Aprovar a peça: ${card.titulo}`,
          entrega: shiftDays(atualizado, 3),
          entregaFixa: true,
          aba: "conteudos",
          lado: "cliente",
          href: clientCardHref(card.slug, card.id),
        }),
      );
    } else if (card.status === "agendado") {
      itens.push(
        linha({
          ...marca,
          ...daRafa,
          chave: `card:${card.id}:conferir-ar`,
          titulo: `Conferir o que vai ao ar: ${card.titulo}`,
          entrega: publicacao,
          aba: "conteudos",
          lado: "admin",
          href: card.permalink || adminCardHref(card.status, card.id),
        }),
      );
    }
    if (card.publishError && card.status !== "publicado" && card.status !== "arquivado") {
      itens.push(
        linha({
          ...marca,
          ...daRafa,
          chave: `card:${card.id}:republicar`,
          titulo: `Republicar: ${card.titulo}`,
          entrega: shiftDays(dia(card.publishAttemptedAt, input.today), 1),
          entregaFixa: true,
          aba: "conteudos",
          lado: "admin",
          href: `/admin/aprovacoes?tab=publicar&cliente=${card.cadastroClienteId}&card=${card.id}`,
        }),
      );
    }
  }

  const caixaAberta = new Set<number>();

  for (const cliente of input.clientes) {
    if (!cliente.ativo) continue;
    const acesso = input.clienteUsuario.get(cliente.id);
    const donoCliente = {
      responsavelUserId: acesso?.userId ?? null,
      responsavelNome: acesso?.nome ?? "Cliente",
    };
    const marca = { cadastroClienteId: cliente.id, clienteNome: cliente.nome };
    if (!input.diretrizesIds.has(cliente.id)) {
      const inicio = dia(cliente.dataInicio, input.today);
      itens.push(
        linha({
          ...marca,
          responsavelUserId: rafa?.userId ?? null,
          responsavelNome: rafa?.nome ?? null,
          chave: `diretrizes:${cliente.id}:enviar`,
          titulo: "Enviar as diretrizes da marca",
          entrega: shiftDays(inicio, 7),
          entregaFixa: true,
          aba: "diretrizes",
          lado: "admin",
          href: cliente.slug ? `/cliente/${cliente.slug}/brandbook` : "/admin/brandbook",
        }),
      );
    }

    const doCliente = input.conexoes.filter((item) => item.cadastroId === cliente.id);
    const instagramHref = cliente.slug ? `/cliente/${cliente.slug}/instagram` : "/admin/conexoes";
    for (const rede of REDES) {
      if (!cliente[rede.flag]) continue;
      const conexao = doCliente.find(
        (item) => item.pluginKey === rede.key && item.status !== "disabled",
      );
      if (!conexao) {
        itens.push(
          linha({
            ...marca,
            ...donoCliente,
            avisoUserId: leandro?.userId ?? null,
            chave: `conexao:${cliente.id}:${rede.key}:faltando`,
            titulo: `Conectar ${rede.label}`,
            entrega: shiftDays(input.today, 7),
            entregaFixa: true,
            aba: "conexoes",
            lado: "admin",
            href: "/admin/conexoes",
          }),
        );
        continue;
      }
      const ruim =
        conexao.healthStatus === "unhealthy" ||
        conexao.healthStatus === "degraded" ||
        conexao.status === "disabled";
      if (ruim) {
        itens.push(
          linha({
            ...marca,
            ...donoCliente,
            avisoUserId: leandro?.userId ?? null,
            chave: `conexao:${conexao.id}:falha`,
            titulo: `Resolver ${rede.label}`,
            entrega: shiftDays(input.today, 7),
            entregaFixa: true,
            aba: "conexoes",
            lado: "admin",
            href: `/admin/conexoes/${conexao.id}`,
          }),
        );
      }
      if (rede.key === "instagram_organic" && conexao.lastSyncAt) {
        const syncDia = conexao.lastSyncAt.slice(0, 10);
        if (syncDia < input.today) {
          itens.push(
            linha({
              ...marca,
              responsavelUserId: leandro?.userId ?? null,
              responsavelNome: leandro?.nome ?? null,
              chave: `crm:${cliente.id}:puxar-instagram`,
              titulo: "Puxar o Instagram",
              entrega: input.today,
              aba: "conexoes",
              lado: "admin",
              href: instagramHref,
            }),
          );
        }
        const horas = horasDesde(conexao.lastSyncAt, input.today);
        if (horas != null && horas >= 48) {
          itens.push(
            linha({
              ...marca,
              ...donoCliente,
              avisoUserId: leandro?.userId ?? null,
              chave: `conexao:${cliente.id}:sem-sync`,
              titulo: "Restaurar o sync do Instagram",
              entrega: shiftDays(input.today, 3),
              entregaFixa: true,
              aba: "conexoes",
              lado: "admin",
              href: instagramHref,
            }),
          );
        }
      }
      const vence = dia(conexao.tokenExpiresAt, "");
      if (conexao.needsReauth || (vence && vence <= shiftDays(input.today, 1))) {
        itens.push(
          linha({
            ...marca,
            ...donoCliente,
            avisoUserId: leandro?.userId ?? null,
            chave: `conexao:${conexao.id}:renovar`,
            titulo: `Renovar ${rede.label}`,
            entrega: shiftDays(input.today, 7),
            entregaFixa: true,
            aba: "conexoes",
            lado: "admin",
            href: `/admin/conexoes/${conexao.id}`,
          }),
        );
      }
    }
  }

  const semana = mondayDaSemana(input.today);
  if (input.analisesEnviadas) {
    for (const cliente of input.clientes) {
      if (!cliente.ativo) continue;
      if (input.analisesEnviadas.has(`${cliente.id}:${semana}`)) continue;
      itens.push(
        linha({
          cadastroClienteId: cliente.id,
          clienteNome: cliente.nome,
          responsavelUserId: leandro?.userId ?? null,
          responsavelNome: leandro?.nome ?? null,
          chave: `relatorio:${cliente.id}:${semana}`,
          titulo: "Analisar o relatório da semana",
          entrega: semana,
          aba: "relatorio",
          lado: "admin",
          href: cliente.slug ? `/cliente/${cliente.slug}/relatorio` : "/admin/relatorios",
        }),
      );
    }
  }

  for (const queda of input.quedas ?? []) {
    if (queda.registrada) continue;
    const cliente = clientes.get(queda.cadastroClienteId);
    if (!cliente?.ativo) continue;
    itens.push(
      linha({
        cadastroClienteId: cliente.id,
        clienteNome: cliente.nome,
        responsavelUserId: leandro?.userId ?? null,
        responsavelNome: leandro?.nome ?? null,
        chave: `relatorio:queda:${cliente.id}:${queda.periodoInicio}`,
        titulo: "Explicar a queda de resultado",
        entrega: shiftDays(input.today, 3),
        entregaFixa: true,
        aba: "relatorio",
        lado: "admin",
        href: cliente.slug ? `/cliente/${cliente.slug}/relatorio` : "/admin/relatorios",
      }),
    );
  }

  for (const pessoa of input.pessoas) {
    if (!pessoa.cadastroClienteId || pessoa.ignoredAt) continue;
    const cliente = clientes.get(pessoa.cadastroClienteId);
    if (!cliente?.ativo) continue;
    const crmHref = pessoa.slug ? `/cliente/${pessoa.slug}/crm` : "/admin/crm";
    const marca = { cadastroClienteId: pessoa.cadastroClienteId, clienteNome: cliente.nome };
    const operacao = {
      responsavelUserId: leandro?.userId ?? null,
      responsavelNome: leandro?.nome ?? null,
      entrega: shiftDays(input.today, 7),
      entregaFixa: true,
      aba: "crm" as const,
      lado: "admin" as const,
      href: crmHref,
    };
    const aberto = !!pessoa.lastKind && pessoa.lastKind !== "brand_reply";
    if (aberto) {
      caixaAberta.add(pessoa.cadastroClienteId);
      itens.push(
        linha({
          ...marca,
          ...operacao,
          chave: `crm:inbox:${pessoa.id}`,
          titulo: `Responder ${pessoa.nome}`,
        }),
      );
    }
    const emRisco = pessoa.churnState === "em_risco" || pessoa.churnState === "dormindo";
    if (
      emRisco &&
      pessoa.intentScore != null &&
      pessoa.intentScore >= 70 &&
      pessoa.lastKind !== "brand_reply"
    ) {
      itens.push(
        linha({
          ...marca,
          ...operacao,
          chave: `crm:intent:${pessoa.id}`,
          titulo: `Atender ${pessoa.nome}`,
        }),
      );
    } else if (emRisco && pessoa.lastKind !== "brand_reply") {
      itens.push(
        linha({
          ...marca,
          ...operacao,
          chave: `crm:risco:${pessoa.id}`,
          titulo: `Olhar ${pessoa.nome}`,
        }),
      );
    }
  }

  for (const clienteId of caixaAberta) {
    const cliente = clientes.get(clienteId);
    if (!cliente) continue;
    const acesso = input.clienteUsuario.get(clienteId);
    itens.push(
      linha({
        cadastroClienteId: clienteId,
        clienteNome: cliente.nome,
        responsavelUserId: acesso?.userId ?? null,
        responsavelNome: acesso?.nome ?? "Cliente",
        chave: `crm:caixa:${clienteId}`,
        titulo: "Olhar a caixa do CRM",
        entrega: mondayDaSemana(input.today),
        aba: "crm",
        lado: "cliente",
        href: cliente.slug ? `/cliente/${cliente.slug}/crm` : "/admin/crm",
      }),
    );
  }

  for (const pedido of input.pedidos ?? []) {
    itens.push(
      linha({
        cadastroClienteId: null,
        clienteNome: "Pedido de acesso",
        responsavelUserId: leandro?.userId ?? null,
        responsavelNome: leandro?.nome ?? null,
        chave: `acesso:${pedido.id}`,
        titulo: `Analisar pedido de ${pedido.nome}`,
        entrega: shiftDays(dia(pedido.criadoEm, input.today), 7),
        entregaFixa: true,
        aba: "conteudos",
        lado: "admin",
        href: "/admin/solicitacoes",
      }),
    );
  }

  return itens;
}
