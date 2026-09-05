---
title: Arquitetura — Fluxo de Dados
description: Como os dados percorrem o sistema, da API de marketing ao dashboard.
status: living
owner: Engenharia Lots BI
last_review: 2026-06-26
---

# Arquitetura — Fluxo de Dados

> Este documento descreve o **estado atual**. O fluxo alvo (coletores → fila → workers) está
> em [Arquitetura alvo](./target-architecture.md) e [Coletores alvo](../07-integrations/target-collectors.md).

## Visão ponta a ponta (estado atual)

```mermaid
sequenceDiagram
    autonumber
    participant API as APIs de Marketing
    participant Make as Make (worker)
    participant BM as base_metricas
    participant V as Views vw_*
    participant FE as Frontend
    participant ENG as Engine (TS)
    participant U as Usuário

    API->>Make: métricas brutas (por conta/dia)
    Make->>BM: INSERT (data, cliente, plataforma, metrica, valor, campanha)
    Note over BM,V: Leitura sob demanda do usuário
    U->>FE: abre dashboard (período)
    FE->>V: SELECT vw_overview_cliente (janela atual + anterior)
    V->>BM: normaliza, aplica aliases, filtra por current_user_clientes()
    V-->>FE: linhas normalizadas
    FE->>ENG: agrega + deriva KPIs + séries diárias
    ENG-->>FE: totais, deltas, insights
    FE-->>U: dashboard renderizado
```

---

## Etapa 1 — Ingestão (externa, Make)

Cenários no Make leem os **IDs técnicos** de cada cliente em `cadastro_clientes`
(`google_ads_customer_id`, `ga4_property_id`, `facebook_ad_account_id`,
`instagram_page_id`, `google_business_location_id`, `tiktok_ad_account_id`), chamam as APIs
e gravam em `base_metricas` no formato _long_:

| coluna       | exemplo              |
| ------------ | -------------------- |
| `data`       | `2026-06-25`         |
| `cliente`    | `Antena`             |
| `plataforma` | `Google Ads`         |
| `metrica`    | `spend`              |
| `valor`      | `164824476` (micros) |
| `campanha`   | `Branding - Junho`   |

> ⚠️ **INFORMAÇÃO NÃO ENCONTRADA** — o schema de `base_metricas` e os cenários do Make não
> estão versionados no repositório. O formato acima é **inferido** das views e migrations.
> Detalhes e lacunas em [Integrações → Pipeline de ingestão](../07-integrations/integrations.md#pipeline-de-ingestão-workers).

---

## Etapa 2 — Normalização (Postgres views)

A view base `vw_metricas_normalizadas` (definida em
`supabase/migrations-official/08_aliases_e_null_guard.sql`) faz, em uma só passada:

1. **Padroniza plataforma** para snake_case (`"Google Ads"` → `google_ads`).
2. **Padroniza métrica** para minúsculas.
3. **Converte Google Ads `spend`** de micros para moeda (`valor / 1.000.000`).
4. **Aplica alias de cliente** → expõe sempre o nome canônico (`COALESCE(alias, cliente)`).
5. **Descarta `valor IS NULL`** (ruído).
6. **Filtra por `current_user_clientes()`** (isolação multi-tenant).

A partir dela, views derivadas pivotam por plataforma e dia
(`vw_meta_ads_diario`, `vw_google_ads_diario`, `vw_ga4_diario`, `vw_instagram_diario`,
`vw_google_business_diario`), além de `vw_overview_cliente` e `vw_clientes_ativos`.

Detalhes em [Banco → Views](../04-database/views.md).

---

## Etapa 3 — Leitura (Frontend + React Query)

O frontend consulta as views **diretamente** via client Supabase anon. Padrão recorrente:
buscar a janela `[prevFrom, to]` numa única query para já ter o comparativo.

```ts
// src/routes/_authenticated/dashboard.tsx (resumo)
supabase
  .from("vw_overview_cliente")
  .select("*")
  .gte("data", prevFrom)
  .lte("data", to)
  .order("data", { ascending: true });
```

As queries são encapsuladas em `queryOptions` do React Query, com `queryKey` que inclui o
período — garantindo cache correto por janela.

---

## Etapa 4 — Cálculo (Engine puro)

Nenhum componente calcula KPI. O fluxo é:

```mermaid
flowchart LR
    rows["Linhas da view"] --> agg["aggregate()\nsoma/avg/max/last por métrica"]
    agg --> kpi["deriveKpis()\nformulas.ts (CTR, CPC, CPA...)"]
    rows --> daily["dailySeries()\n1 ponto por dia"]
    rows --> camp["byCampaign()\nranking"]
    kpi --> ui["Cards / Tabelas / Charts"]
    daily --> ui
    camp --> ui
```

- `src/lib/platforms/engine.ts` — agregação genérica a partir de um `PlatformDef`.
- `src/lib/platforms/aggregations.ts` — estratégias (`sum`, `avg`, `max`, `min`, `first`, `last`, `custom`).
- `src/lib/platforms/formulas.ts` — fórmulas oficiais (fonte única de verdade).
- `src/lib/metrics.ts` — agregação específica do overview consolidado + insights.

> **Detalhe importante:** algumas métricas não são somáveis entre dias. Em
> `sumOverview()` (`src/lib/metrics.ts`), `google_spend` e `instagram_reach` usam **MAX por
> cliente** (cumulativo / contagem única), enquanto o resto soma. Isso é intencional e está
> comentado no código.

---

## Etapa 5 — Escrita (Server Functions)

Operações de escrita (cadastro, serviços, usuários, editorial) **não** passam pelo client
anon direto: vão por server functions que validam token + Zod e aplicam regras de papel.
Ver [Backend → API Reference](../03-backend/api-reference.md).

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant ATT as attachSupabaseAuth (client mw)
    participant SF as Server Function
    participant REQ as requireSupabaseAuth (server mw)
    participant PG as Postgres

    FE->>ATT: chama server fn
    ATT->>SF: + header Authorization: Bearer <jwt>
    SF->>REQ: valida token (auth.getUser)
    REQ-->>SF: { supabase (RLS), userId, claims }
    SF->>PG: query (RLS do usuário) ou service-role
    PG-->>FE: resultado
```

---

## Fluxo alvo (visão futura — não implementado)

```mermaid
sequenceDiagram
    autonumber
    participant API as APIs Oficiais
    participant C as Coletor Lots BI
    participant Q as Fila
    participant W as Worker
    participant DB as Postgres (métricas oficiais)
    participant MET as Motor de Métricas
    participant API2 as API Interna
    participant FE as Frontend

    API->>C: fetch métricas oficiais
    C->>Q: enqueue sync job
    Q->>W: process
    W->>DB: UPSERT (impressions, clicks, spend…)
    FE->>API2: request dashboard (período)
    API2->>DB: SELECT métricas oficiais
    API2->>MET: derive KPIs (CTR, CPC…)
    MET-->>FE: totais, séries, insights
```

Ver [Modelo de métricas](../04-database/metrics-model.md) para regra oficial vs derivada.
