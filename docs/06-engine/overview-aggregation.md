---
title: Overview & Relatórios — metrics.ts
description: Agregação cross-platform para dashboards consolidados e relatórios admin.
status: living
owner: Engenharia Lots BI
last_review: 2026-09-11
---

# Overview & Relatórios — `metrics.ts`

**Arquivo:** `src/lib/metrics.ts`

Camada de agregação **cross-platform** para overview executivo, dashboard do cliente e
`/admin/relatorios`. Complementa (não substitui) o platform engine.

**Timeout 2026-09-11:** as abas admin **não** devem ler `vw_overview_cliente` 8-union no browser.
Usar `getAdminPortfolioFn` → RPC `portfolio_overview` / `portfolio_clientes_ativos` (migration 56).
Auditoria e plano: `docs/reports/overview-relatorios-timeout-audit.md`.

---

## Consumidores

| Tela                      | Funções principais                                            |
| ------------------------- | ------------------------------------------------------------- |
| `/dashboard`              | `sumOverview`, insights                                       |
| `/admin`                  | `sumOverview`, `aggregateByCliente`                           |
| `/admin/relatorios`       | `aggregateByCliente`, `deriveCtr`, `deriveCpa`, `periodRange` |
| `/cliente/{slug}` (index) | Overview por cliente                                          |

---

## Tipos exportados

| Tipo           | Uso                                      |
| -------------- | ---------------------------------------- |
| `Platform`     | Enum de plataformas (inclui GBP, TikTok) |
| `CommonMetric` | Métricas canônicas cross-channel         |
| `OverviewRow`  | Linha de `vw_overview_cliente` tipada    |
| `MetricMeta`   | Labels, formato, tom visual              |

---

## Constantes

- `PLATFORM_LABEL` — rótulos pt-BR
- `PLATFORM_FAMILY` — `paid` | `organic` | `analytics`
- `METRIC_META` — metadados de display por `CommonMetric`

---

## Funções principais

| Função                           | Descrição                                      |
| -------------------------------- | ---------------------------------------------- |
| `formatMetric(metric, value)`    | Formatação pt-BR/BRL                           |
| `sumOverview(rows, period)`      | Totais consolidados do overview                |
| `aggregateByCliente(rows, days)` | Agregação por cliente (relatórios)             |
| `deriveCtr(rows)`                | CTR derivado para overview                     |
| `deriveCpa(spend, conversions)`  | CPA                                            |
| `pctDelta(current, prev)`        | Delta % entre períodos                         |
| `periodRange(days)`              | Janela 7/30/90 dias — **paralelo a period.ts** |
| `buildInsights(...)`             | Textos automáticos de insights                 |

---

## Semânticas especiais em `sumOverview`

| Métrica           | Estratégia          | Motivo                      |
| ----------------- | ------------------- | --------------------------- |
| `google_spend`    | **MAX** por cliente | Spend cumulativo/reportado  |
| `instagram_reach` | **MAX** por cliente | Contagem única, não somável |
| `conversions`     | **SUM** de `meta_results` + `google_conversions` + `ga4_conversions` | Pixel Meta (`meta_conversions`) não entra — evitaria dobro. GA4 sozinho zerava o KPI. |
| Demais            | **SUM**             | Acumulativas                |

Comentado no código — crítico para não "corrigir" sem entender.

---

## Dívida: duplicação com platform engine

- Insights duplicados em `dashboard.tsx` vs `metrics.ts` (D8)
- `periodRange` vs `resolvePeriod` (dois sistemas de período)
- Meta reach: SUM no PlatformDef, MAX no overview

**Meta:** convergir em motor único. Ver [roadmap](../11-roadmap/roadmap.md).

---

## Referências

- [Engine overview](./overview.md)
- [Dashboards](../06-dashboards/dashboards.md)
- [Admin — Relatórios](../06-dashboards/admin-modules.md#relatórios)
