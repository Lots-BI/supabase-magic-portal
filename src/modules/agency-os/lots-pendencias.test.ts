import { describe, expect, it } from "vitest";
import {
  buildLotsPendencias,
  DONO_CONTEUDO_EMAIL,
  DONO_OPERACAO_EMAIL,
  type PendenciaCard,
  type PendenciaCliente,
  type PendenciaPessoa,
} from "./lots-pendencias";

const cliente: PendenciaCliente = {
  id: 1,
  nome: "Alfa",
  slug: "alfa",
  ativo: true,
  dataInicio: "2026-10-01",
  responsavelUserId: null,
  instagramAtivo: false,
  tiktokAtivo: false,
  metaAtivo: false,
  googleAdsAtivo: false,
  ga4Ativo: false,
  googleBusinessAtivo: false,
};

function card(status: string, checklist: unknown = []): PendenciaCard {
  return {
    id: "card-1",
    status,
    titulo: "Reels",
    cadastroClienteId: 1,
    clienteNome: "Alfa",
    slug: "alfa",
    dataPublicacao: "2026-10-10",
    checklist,
    responsavelUserId: null,
    responsavelEmail: null,
    publishError: null,
    publishStatus: null,
  };
}

const vazio = {
  today: "2026-10-03",
  clientes: [cliente],
  conexoes: [],
  pessoas: [],
  diretrizesIds: new Set<number>([1]),
  clienteUsuario: new Map<number, { userId: string; nome: string }>(),
  usuarioNome: new Map<string, string>(),
};

describe("pendências Lots BI", () => {
  it("pede as mídias enquanto o cliente não enviou e troca quando envia", () => {
    const pedindo = buildLotsPendencias({ ...vazio, cards: [card("aguardando_material")] });
    expect(pedindo.map((item) => item.chave)).toEqual(["card:card-1:enviar-midias"]);
    expect(pedindo[0]?.href).toBe("/cliente/alfa/aprovacoes?card=card-1");

    const recebido = buildLotsPendencias({
      ...vazio,
      cards: [card("aguardando_material", [{ id: "material_recebido", done: true }])],
    });
    expect(recebido.map((item) => item.chave)).toEqual(["card:card-1:baixar-material"]);
    expect(recebido[0]?.href).toBe("/admin/aprovacoes?tab=biblioteca&cliente=1&card=card-1");

    const aprovacao = buildLotsPendencias({
      ...vazio,
      cards: [card("aguardando_aprovacao")],
      clienteUsuario: new Map([[1, { userId: "cliente", nome: "Cliente Alfa" }]]),
    });
    expect(aprovacao[0]?.lado).toBe("cliente");
    expect(aprovacao[0]?.entrega).toBe("2026-10-03");
  });

  it("entrega Conteúdos e Diretrizes à Rafa e o resto do admin ao Leandro", () => {
    const donosPorEmail = new Map([
      [DONO_CONTEUDO_EMAIL, { userId: "rafa", nome: "Rafa" }],
      [DONO_OPERACAO_EMAIL, { userId: "leandro", nome: "Leandro" }],
    ]);
    const pessoa: PendenciaPessoa = {
      id: "pessoa-1",
      cadastroClienteId: 1,
      nome: "Ana",
      slug: "alfa",
      lastKind: "comment",
      ignoredAt: null,
      churnState: null,
      intentScore: null,
    };
    const itens = buildLotsPendencias({
      ...vazio,
      diretrizesIds: new Set<number>(),
      cards: [card("aguardando_material", [{ id: "material_recebido", done: true }])],
      pessoas: [pessoa],
      donosPorEmail,
      clienteUsuario: new Map([[1, { userId: "cliente", nome: "Cliente Alfa" }]]),
    });
    const porChave = new Map(itens.map((item) => [item.chave, item]));

    expect(porChave.get("card:card-1:baixar-material")?.responsavelUserId).toBe("rafa");
    expect(porChave.get("diretrizes:1:enviar")?.lado).toBe("admin");
    expect(porChave.get("diretrizes:1:enviar")?.responsavelUserId).toBe("rafa");
    expect(porChave.get("diretrizes:1:cobrar")).toBeUndefined();
    expect(porChave.get("crm:inbox:pessoa-1")?.responsavelUserId).toBe("leandro");
    expect(porChave.get("crm:inbox:pessoa-1")?.lado).toBe("admin");
    expect(porChave.get("crm:inbox:pessoa-1")?.entrega).toBe("2026-10-10");
  });

  it("abre a análise da semana e some quando ela já foi enviada", () => {
    const aberta = buildLotsPendencias({
      ...vazio,
      cards: [],
      analisesEnviadas: new Set<string>(),
    });
    expect(aberta.some((item) => item.chave === "relatorio:1:2026-09-28")).toBe(true);

    const enviada = buildLotsPendencias({
      ...vazio,
      cards: [],
      analisesEnviadas: new Set(["1:2026-09-28"]),
      quedas: [
        {
          cadastroClienteId: 1,
          periodoInicio: "2026-09-04",
          periodoFim: "2026-10-03",
          registrada: true,
        },
      ],
    });
    expect(enviada.some((item) => item.chave.startsWith("relatorio:"))).toBe(false);
  });
});
