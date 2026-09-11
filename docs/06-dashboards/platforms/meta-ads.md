---
title: Meta Ads — Dashboard
description: Origem dos dados, métricas, fórmulas e semântica de reach no dashboard Meta Ads.
status: living
owner: Engenharia / Dados Lots BI
tags: [dashboard, meta-ads, platformdef]
difficulty: intermediate
last_review: 2026-09-11
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

## Métricas oficiais (nomes do Gerenciador)

Coleta: Insights `actions` + fields de entrega. View: migration 58 acrescenta conversas
e engajamento com a Página no **fim** de `vw_meta_ads_diario`.

| Key | Label no dashboard | Agg | Origem |
| --- | --- | --- | --- |
| spend | Valor gasto | sum | `spend` |
| results | Resultados | sum | `results` / `objective_results`, senão actions |
| messaging_conversations_started | Conversas por mensagem iniciadas | sum | `onsite_conversion.messaging_conversation_started_7d` |
| messaging_first_replies | Novas conexões de mensagem | sum | `onsite_conversion.messaging_first_reply` |
| clicks | Cliques (todos) | sum | `clicks` |
| inline_link_clicks | Cliques no link | sum | `inline_link_clicks` |
| unique_clicks | Cliques únicos | **max** | `unique_clicks` (não somar dias) |
| impressions | Impressões | sum | `impressions` |
| reach | Alcance | **max** | `reach` (não somar dias) |
| video_views | Visualizações de vídeo de 3 segundos | sum | `video_view` |
| landing_page_views | Visualizações da página de destino | sum | `landing_page_view` |
| post_engagements | Engajamento com a publicação | sum | `post_engagement` |
| page_engagements | Engajamento com a Página | sum | `page_engagement` |
| conversions | Conversões | sum | campo `conversions` |
| link_clicks | Cliques no link (ações) | sum | ação `link_click` |

A Insights API **tem** os fields `results` e `objective_results` — o mesmo recorte da
coluna Resultados do Gerenciador. O coletor pede esses fields primeiro (com fallback
para `actions` + `conversions` se a conta recusar). Sem o field oficial, o mapper
reconstrói: compra → evento custom → lead → **mensagem WhatsApp/Messenger**; tráfego
(LPV/clique) só com `objective` de tráfego. Campanha `OUTCOME_SALES` sem venda fica 0
(não conta LPV). Sem objective, uma conversa no WhatsApp **é** Resultado (caso Rodrigo).

Ver [`meta-insights.mapper.ts`](../../../src/modules/platform-hub/plugins/meta_ads/api/meta-insights.mapper.ts).

Dias já coletados **com entrega** e sem `messaging_conversations_started` voltam como
faltantes no **Puxar métricas**. Marcadores de dia sem entrega (só results/conversions 0)
continuam preenchidos.

## KPIs derivados

CTR, CTR do link, CPC, CPC do link, CPM, Frequência (`impressions / reach`),
**Custo por resultado** (`spend / results`), **Custo por conversão** (`spend / conversions`).

## Limitações e dívida técnica

No **dashboard Meta**, `reach` e `unique_clicks` agregam com **MAX** (pico diário).
Somar dias inflaria pessoas únicas em relação ao Gerenciador no período.

## Comportamento na UI

- Frequency aparece como KPI derivado quando reach > 0.
- Filtros de período aplicam-se à view diária antes da agregação.

## Referências

- [Catálogo de plataformas](../../06-engine/platform-catalog.md)
