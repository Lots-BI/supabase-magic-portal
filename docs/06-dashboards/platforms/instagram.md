---
title: Instagram — Dashboard
description: Métricas orgânicas do Instagram, agregação MAX para reach e KPIs de engajamento.
status: living
owner: Engenharia / Dados Lotus
tags: [dashboard, instagram, platformdef]
difficulty: intermediate
last_review: 2026-09-05
---

# Instagram

## Origem dos dados

| Item         | Valor                            |
| ------------ | -------------------------------- |
| Platform key | `instagram`                      |
| View SQL     | `vw_instagram_diario` (via `vw_instagram_normalizada_prefer_hub`, migration 34) |
| PlatformDef  | `src/lib/platforms/instagram.ts` |

## Coleta — Platform Hub substitui o Make

O botão **Puxar métricas** (no header do dashboard, ao lado do seletor de período) chama
`syncInstagramProfileFn`, que:

1. Detecta os dias **faltantes** para o cliente dentro do lookback de conta da Meta (~90 dias,
   `INSTAGRAM_PROFILE_LOOKBACK_DAYS = 89` + "ontem", pois insights têm atraso de 24–48h).
2. Coleta cada intervalo contínuo faltante via Graph API
   (`GET /{ig-user-id}/insights?period=day&metric_type=total_value`, uma chamada por dia —
   apenas `reach` suporta `time_series`; as demais métricas de conta só têm `total_value`).
3. Grava em `base_metricas_hub` via `MetricPipeline` (nunca em `base_metricas_make`).
4. Limita a 30 dias por clique (`INSTAGRAM_PROFILE_MAX_DAYS_PER_RUN`) — cliques repetidos
   completam o backfill histórico progressivamente.

Implementação: plugin `instagram_organic`, capability `instagram_organic:profile:collect`
(dual com `instagram_organic:metrics:collect`, que continua exclusiva de `/publicacoes`).

- Graph client: [`instagram-graph-client.ts`](../../../src/modules/platform-hub/plugins/instagram_organic/api/instagram-graph-client.ts) (`fetchAccountInsightsForDay`)
- Mapper: [`instagram-account-insights.mapper.ts`](../../../src/modules/platform-hub/plugins/instagram_organic/api/instagram-account-insights.mapper.ts)
- Provider: [`official-instagram.provider.ts`](../../../src/modules/platform-hub/plugins/instagram_organic/providers/official-instagram.provider.ts)
- Gap finder (puro/testado): [`instagram-profile-gap-finder.ts`](../../../src/modules/instagram-posts/instagram-profile-gap-finder.ts)
- Sync server: [`instagram-profile-sync.server.ts`](../../../src/modules/instagram-posts/instagram-profile-sync.server.ts)

O dashboard passa a exibir o dado do Hub automaticamente quando existir para aquele dia
(ver migration 34 em [views.md](../../04-database/views.md)); nos dias sem Hub, continua
mostrando o Make normalmente. **Make não é desligado automaticamente** — ver critérios em
[current-pipeline-make.md](../../07-integrations/current-pipeline-make.md).

Coleta de **publicações** (`/publicacoes`, feed/reels/stories) é independente — ver
[instagram-posts.md](../instagram-posts.md).

## Métricas oficiais

| Key                | Coluna             | Agregação |
| ------------------ | ------------------ | --------- |
| reach              | reach              | **max**   |
| accounts_engaged   | accounts_engaged   | **max**   |
| interactions       | interactions       | sum       |
| likes              | likes              | sum       |
| comments           | comments           | sum       |
| saves              | saves              | sum       |
| shares             | shares             | sum       |
| profile_links_taps | profile_links_taps | sum       |

## KPIs derivados

- **Engagement rate:** `interactions / reach × 100`
- Média diária de interações (card comparativo)

## Comportamento

Estratégia **MAX** para `reach` está documentada no próprio `PlatformDef` — ajustável sem alterar componentes de UI.

## Referências

- [Catálogo de plataformas](../../06-engine/platform-catalog.md)
