---
title: Dashboards — KPIs, Fórmulas e Telas
description: Catálogo das telas analíticas, métricas exibidas e fórmulas oficiais.
status: living
owner: Engenharia Lots BI
last_review: 2026-06-26
---

# Dashboards

Os dashboards são a entrega central do Lots BI. Todos consomem as [views](../04-database/views.md)
e calculam via [engine de métricas](../06-engine/overview.md). **Nenhum número é calculado
dentro do componente** — apenas exibido.

Telas operacionais (editorial, relatórios, admin CRUD): [Módulos admin](./admin-modules.md).

---

## Telas

### 1. Dashboard Executivo (admin) — `/admin`

Arquivo: `src/routes/_authenticated/admin/index.tsx`.

- **Hero KPIs:** investimento total (Meta + Google), clientes ativos, alcance Instagram,
  sessões GA4, conversões (com CPA).
- **Secundários:** serviços ativos, acessos vinculados, última sincronização, CTR consolidado.
- **Gráficos:** evolução diária (Meta + Google + conversões), mix de investimento (donut).
- **Listas:** top clientes por investimento, status de ingestão por conta.
- Fonte: `vw_overview_cliente` + `vw_clientes_ativos` + `listClientes`/`listServicos`.

### 2. Visão Geral do Cliente (cliente) — `/dashboard`

Arquivo: `src/routes/_authenticated/dashboard.tsx`.

- Hero de investimento (Google/Meta), conversões, sessões, cliques.
- Evolução diária, insights automáticos, resumo do período, plataformas conectadas, lista de
  contas vinculadas.
- Fonte: `vw_overview_cliente` + `vw_clientes_ativos`.

### 3. Conta do Cliente — `/cliente/{slug}`

Arquivo: `src/routes/_authenticated/cliente.$cliente.index.tsx`.

- KPIs (alcance, engajamento, impressões, cliques, conversões).
- **Comparativos 7/30/90 dias** lado a lado.
- Mix de investimento, resumo, insights e **detalhamento por plataforma** em abas.

### 4. Dashboards por Plataforma — `/cliente/{slug}/{plataforma}`

Componente genérico `PlatformDashboard` (ver
[Design System](../05-frontend/component-system.md)). Para cada plataforma com `PlatformDef`
(Google Ads, Meta Ads, Instagram, GA4):

- Header narrativo com as perguntas de negócio.
- Cards hero + KPIs.
- Gráficos declarados no `PlatformDef`.
- Comparativo período atual × anterior (tabela).
- **Ranking de campanhas** (quando há `campaignField`).
- Tabela diária + insights automáticos.

> **Cobertura atual:** Google Ads, Meta Ads, Instagram e GA4 têm `PlatformDef`. Google
> Business tem view mas ainda não tem `PlatformDef`; TikTok não tem view nem `PlatformDef`
> (só aparece quando houver dados). Ver [Roadmap](../11-roadmap/roadmap.md).

---

## Componentes de experiência (Lots BI)

Camada compartilhada em `src/components/lots/` — reutilizada em dashboards, cliente e admin:

| Componente             | Uso                                                                         |
| ---------------------- | --------------------------------------------------------------------------- |
| `MetricLabel`          | Rótulo de KPI com tooltip explicativo (ícone ℹ).                            |
| `StatCard`             | Card de métrica com `description` + `hint` opcional.                        |
| `EmptyState`           | Estados vazios padronizados (ícone, título, descrição).                     |
| `DashboardSkeleton`    | Loading unificado para dashboards.                                          |
| `SyncStatusBar`        | Última sincronização, ingestão e plataformas ativas (`vw_clientes_ativos`). |
| `GlobalSearch`         | Paleta `Ctrl+K` — rotas, clientes e glossário.                              |
| `NotificationCenter`   | Central de notificações (persistência local).                               |
| `ApprovalWorkflowCard` | Workflow de aprovação com preview ampliável e timeline (`post_revisions`).  |

Descrições canônicas das métricas: `METRIC_META` e `PLATFORM_METRIC_DESCRIPTIONS` em
`src/lib/metrics.ts`. Tooltips exigem `TooltipProvider` no root (`__root.tsx`).

---

## Fórmulas oficiais

Definidas em `src/lib/platforms/formulas.ts`. Sempre sobre **totais agregados**, com divisão
segura (denominador ≤ 0 → 0).

| KPI                | Fórmula                        | "Subir é bom?" |
| ------------------ | ------------------------------ | -------------- |
| CTR                | `clicks / impressions × 100`   | Sim            |
| CPC                | `spend / clicks`               | Não            |
| CPM                | `spend / impressions × 1000`   | Não            |
| CPA                | `spend / conversions`          | Não            |
| Taxa de conversão  | `conversions / sessions × 100` | Sim            |
| Frequência         | `impressions / reach`          | —              |
| Engagement rate    | `interactions / reach × 100`   | Sim            |
| Eventos por sessão | `events / sessions`            | —              |
| Views por usuário  | `pageviews / users`            | —              |
| Média diária       | `total / dias`                 | —              |

---

## Regras de agregação que importam

Em `src/lib/metrics.ts` (`sumOverview`):

- **`google_spend`** → **MAX por cliente** no período (as integrações enviam cumulativo do
  período; somar entre dias inflaria).
- **`instagram_reach`** → **MAX por cliente** (reach = contas únicas; somar contaria a mesma
  pessoa várias vezes — _best-effort lower bound_).
- Demais métricas → soma entre dias.

> Essa assimetria é **intencional** e está comentada no código. Ao mexer em agregação de
> overview, preserve essa semântica ou atualize esta seção + o ADR correspondente.

---

## Insights automáticos

Gerados sem invenção, a partir de variações relevantes:

- No overview (`buildInsights` em `metrics.ts`): conversões (±5%), investimento (±8%), CTR
  (limiar 1,5%), CPA (≥5 conversões), tráfego/sessões (±10%).
- Nos dashboards de plataforma (`InsightsBlock`): KPIs com variação > 8% e métricas hero com
  variação > 10%; se nada relevante, mostra "período estável".

> **Dívida conhecida:** `dashboard.tsx` reimplementa `buildInsights` localmente em vez de
> usar o de `metrics.ts`. Unificar é item de [Roadmap](../11-roadmap/roadmap.md).

---

## Períodos e deltas

Toda janela vem de `src/lib/period.ts` (fuso America/Sao_Paulo). Presets: hoje, ontem, 7/30/90
dias, este mês, mês passado, custom. O delta sempre compara com uma **janela anterior de mesmo
tamanho**. Ver [ADR-0006](../02-architecture/adr/0006-timezone-america-sao-paulo.md).
