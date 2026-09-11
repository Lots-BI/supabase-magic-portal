---
title: Arquitetura — Fluxo de Dados
description: Como os dados percorrem o sistema, da API de marketing ao dashboard.
status: living
owner: Engenharia Lots BI
last_review: 2026-09-11
---

# Arquitetura — Fluxo de Dados

> Estado atual. Alvo (fila/workers) em [Arquitetura alvo](./target-architecture.md).

## Visão ponta a ponta (2026-09)

```mermaid
sequenceDiagram
    autonumber
    participant API as APIs de Marketing
    participant Hub as Hub cron / Puxar
    participant Make as Make leftover
    participant H as base_metricas_hub
    participant M as base_metricas_make
    participant V as vw_*_diario prefer_hub
    participant RPC as portfolio_overview
    participant FE as Frontend
    participant ENG as Engine TS

    API->>Hub: Insights (ontem BRT)
    Hub->>H: replace_hub_metric_days
    API->>Make: Google/GA4 até haver OAuth
    Make->>M: INSERT long
    Note over V: Dashboards de plataforma
    FE->>V: SELECT JWT
    V->>H: dia Hub ganha
    V->>M: só se Hub não tem o dia
    Note over RPC: Visão geral / Relatórios
    FE->>RPC: getAdminPortfolioFn
    RPC-->>FE: linhas data×cliente
    FE->>ENG: sumOverview (conversões = meta_results + GA4)
```

Ingestão: [current-pipeline-hub.md](../07-integrations/current-pipeline-hub.md).
Make legado: [current-pipeline-make.md](../07-integrations/current-pipeline-make.md).

---

## Etapa 1 — Ingestão (Hub + Make leftover)

**Fonte viva (Meta Ads e Instagram perfil):** Platform Hub. Crons GitHub Actions (03:10 /
03:25 UTC) e botão **Puxar métricas**. Writer: RPC `replace_hub_metric_days` em
`base_metricas_hub`. Fim da janela = ontem `America/Sao_Paulo`.

**Leftover Make:** ainda grava `base_metricas_make` (formato long). Google Ads e GA4
congelados em **2026-08-17** até OAuth Hub. Layout versionado na migration **52**.

Detalhe: [current-pipeline-hub.md](../07-integrations/current-pipeline-hub.md).

| coluna       | exemplo              |
| ------------ | -------------------- |
| `data`       | `2026-09-10`         |
| `cliente`    | `Antena`             |
| `plataforma` | `Google Ads`         |
| `metrica`    | `spend`              |
| `valor`      | `164824476` (micros) |
| `campanha`   | `Branding - Junho`   |

---

## Etapa 2 — Normalização (Postgres views)

A view `vw_metricas` (54) mistura Hub e Make **por dia**. `vw_metricas_normalizadas` aplica
aliases, spend Google `/ 1e6` e `current_user_clientes()`. Dashboards de plataforma **não**
leem essa cadeia: usam `vw_*_diario` + `prefer_hub`.

Overview admin: RPC `portfolio_overview` (não SELECT 8-union no browser).

---

## Etapa 3 — Leitura (Frontend + React Query)

Admin `/admin` e `/admin/relatorios` **não** fazem esse SELECT. Usam
`getAdminPortfolioFn` → `portfolio_overview` / `portfolio_clientes_ativos`.

O dashboard do **cliente** (`/dashboard`) ainda lê `vw_overview_cliente` com JWT + RLS.

As queries vão em `queryOptions` do React Query, `queryKey` com o período.

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
