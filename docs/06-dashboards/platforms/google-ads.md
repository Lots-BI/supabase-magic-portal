---
title: Google Ads — Dashboard
description: Origem dos dados, métricas, fórmulas e comportamento do dashboard Google Ads no Lots BI.
status: living
owner: Engenharia / Dados Lots BI
tags: [dashboard, google-ads, platformdef]
difficulty: intermediate
last_review: 2026-09-11
related:
  - 06-engine/platform-catalog
  - 06-engine/formulas
---

# Google Ads

## Origem dos dados

| Item           | Valor                             |
| -------------- | --------------------------------- |
| Platform key   | `google_ads`                      |
| View SQL       | `vw_google_ads_diario`            |
| PlatformDef    | `src/lib/platforms/google-ads.ts` |
| Ingestão atual | Hub `prefer_hub` (código + cron). **Sem** conexão OAuth em prod — dashboard lê Make até **2026-08-17**. |
| Granularidade  | Diária por campanha (`campanha`)  |

## Métricas oficiais

| Key         | Coluna      | Agregação | Formato  |
| ----------- | ----------- | --------- | -------- |
| spend       | spend       | sum       | currency |
| impressions | impressions | sum       | int      |
| clicks      | clicks      | sum       | int      |

## KPIs derivados

| KPI | Fórmula                    |
| --- | -------------------------- |
| CTR | `ctr(impressions, clicks)` |
| CPC | `cpc(spend, clicks)`       |
| CPM | `cpm(spend, impressions)`  |

## Limitações

- **Conversões** não estão na view hoje — CPA e taxa de conversão dependem de migration futura.
- Dados históricos dependem da janela sincronizada pelo Make/coletor.

## Comportamento na UI

- Cards e gráficos seguem `PlatformDef` em `google-ads.ts`.
- Período e comparação com período anterior usam `resolvePeriod` (timezone BRT).
- Gráficos declarados em `charts` renderizam via `PlatformDashboard`.

## Referências

- [Catálogo de plataformas](../06-engine/platform-catalog.md)
- [Formula Engine](../06-engine/formulas.md)
