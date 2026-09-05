---
title: Meta Ads — Dashboard
description: Origem dos dados, métricas, fórmulas e semântica de reach no dashboard Meta Ads.
status: living
owner: Engenharia / Dados Lots BI
tags: [dashboard, meta-ads, platformdef]
difficulty: intermediate
last_review: 2026-09-05
---

# Meta Ads

## Origem dos dados

| Item         | Valor                                                                        |
| ------------ | ----------------------------------------------------------------------------- |
| Platform key | `meta_ads`                                                                    |
| View SQL     | `vw_meta_ads_diario` (via `vw_meta_ads_normalizada_prefer_hub`, migration 36) |
| PlatformDef  | `src/lib/platforms/meta-ads.ts`                                               |

## Coleta — Platform Hub substitui o Make

O botão **Puxar métricas** (no header do dashboard, ao lado do seletor de período) chama
`syncMetaAdsCampaignsFn`, que:

1. Detecta os dias **faltantes** para o cliente dentro do lookback (89 dias + "ontem" — escolha
   deliberada e ajustável, não é um limite documentado da API como no Instagram).
2. Coleta cada intervalo contínuo faltante via Marketing Insights API
   (`GET /{ad-account-id}/insights?level=campaign&time_increment=1`) — diferente do Instagram, o
   Meta Ads aceita um range de dias em **uma única chamada** paginada, não uma por dia.
3. Grava em `base_metricas_hub` via `MetricPipeline` (nunca em `base_metricas_make`).
4. Limita a 30 dias por clique (`META_ADS_MAX_DAYS_PER_RUN`) — cliques repetidos completam o
   backfill histórico progressivamente.

Implementação: plugin `meta_ads`, capability `meta:metrics:collect` (mesma capability já usada
pela homologação/dual-run — não foi necessário criar uma nova, diferente do Instagram que
precisou separar perfil de posts).

- Graph client: [`meta-graph-client.ts`](../../../src/modules/platform-hub/plugins/meta_ads/api/meta-graph-client.ts) (`fetchCampaignInsights`)
- Mapper: [`meta-insights.mapper.ts`](../../../src/modules/platform-hub/plugins/meta_ads/api/meta-insights.mapper.ts)
- Provider: [`official-meta.provider.ts`](../../../src/modules/platform-hub/plugins/meta_ads/providers/official-meta.provider.ts)
- Gap finder (puro/testado, reaproveitado do Instagram): [`instagram-profile-gap-finder.ts`](../../../src/modules/instagram-posts/instagram-profile-gap-finder.ts)
- Sync server: [`meta-ads-campaigns-sync.server.ts`](../../../src/modules/meta-ads/meta-ads-campaigns-sync.server.ts)

O dashboard passa a exibir o dado do Hub automaticamente quando existir para aquele dia (ver
migration 36 em [views.md](../../04-database/views.md)); nos dias sem Hub, continua mostrando o
Make normalmente. **Make não é desligado automaticamente** — ver critérios em
[current-pipeline-make.md](../../07-integrations/current-pipeline-make.md).

Conexão: pelo **admin** em `/admin/conexoes/nova` (identidade `ad_account`) ou pelo próprio
**cliente** em `/cliente/:slug/conexoes` (aba **Conexões**, card Meta Ads) — mesmo fluxo
self-service já usado no Instagram, ver [instagram-posts.md](../instagram-posts.md).

## Métricas oficiais

| Key         | Coluna      | Agregação | Nota                     |
| ----------- | ----------- | --------- | ------------------------ |
| spend       | spend       | sum       |                          |
| reach       | reach       | **sum**   | Soma diária no dashboard |
| impressions | impressions | sum       |                          |
| clicks      | clicks      | sum       |                          |
| results     | results     | sum       | Coluna Resultados do Gerenciador |
| conversions | conversions | sum       | Campo `conversions` da Insights API |

A Insights API não tem um campo `results`, e o campo oficial `conversions` frequentemente vem
vazio em campanhas com evento custom do pixel (ex.: OUTCOME_SALES). O coletor pede `actions` +
`conversions` e:

1. **conversions** — soma do campo oficial; se vier vazio, soma compras/leads/`offsite_conversion.custom.*`
2. **results** — compra padrão → evento custom do pixel → lead → mensagem → landing page / clique

Ver [`meta-insights.mapper.ts`](../../../src/modules/platform-hub/plugins/meta_ads/api/meta-insights.mapper.ts).

Dias já coletados sem essas métricas voltam a aparecer como faltantes no **Puxar métricas**
(o gap-finder só considera o dia completo se `base_metricas_hub` já tiver `results` ou
`conversions`).

## KPIs derivados

CTR, CPC, CPM, Frequency (`impressions / reach`), **Custo por resultado** (`spend / results`),
**Taxa de conversão** (`conversions / clicks × 100`)

## Limitações e dívida técnica

No **dashboard Meta**, `reach` agrega com **SUM** (soma dos reaches diários).

No **overview** (`metrics.ts`), métricas similares podem usar **MAX** — diferença documentada como dívida D8 a unificar.

## Comportamento na UI

- Frequency aparece como KPI derivado quando reach > 0.
- Filtros de período aplicam-se à view diária antes da agregação.

## Referências

- [Catálogo de plataformas](../../06-engine/platform-catalog.md)
