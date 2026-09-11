---
title: Ingestão Hub (estado atual)
description: Como o Lots BI coleta métricas em 2026-09 — Hub official_api para Meta/IG, Make leftover, Google/GA4 aguardam OAuth.
status: living
owner: Engenharia Lots BI
last_review: 2026-09-11
---

# Ingestão Hub (estado atual)

Em **2026-09-11** (merge PR #2 em `main`) a fonte viva de Meta Ads e Instagram perfil é o **Platform Hub** (`base_metricas_hub`), não o Make. Make permanece tabela de **leftover** por `(cliente, plataforma, data)` até paridade de 14 dias.

## Quem ganha o dia

| Plataforma | Fonte no dashboard | Coleta noturna | `max(data)` típico |
| ---------- | ------------------ | -------------- | ------------------ |
| Meta Ads | `vw_meta_ads_diario` prefer_hub | Cron `meta-ads-campaigns-sync` 03:10 UTC | Ontem BRT depois do cron |
| Instagram perfil | `vw_instagram_diario` prefer_hub | Cron `instagram-profile-sync` 03:25 UTC | Ontem BRT |
| Instagram publicações | `ig_media` | Cron `instagram-media-sync` | Independente do consolidado |
| Google Ads | `vw_google_ads_diario` prefer_hub | Código + cron prontos | Make até **2026-08-17** até OAuth |
| GA4 | `vw_ga4_diario` prefer_hub | Código + cron prontos | Make até **2026-08-17** até OAuth |
| TikTok / YouTube / GBP | — | Wizard esconde | Sem produto official_api |

Prefer_hub: se o Hub tem o dia (e não é sentinela Meta vazia `campanha=''` + results/conversions 0), o Make daquele dia **não entra**. `ph_metricas_source` XOR **não** é virado para `hub` no consolidado — esconderia Google/GA4.

## Writer

RPC `replace_hub_metric_days` (migration 48): apaga o dia no Hub e reinsere o envelope. **Nunca** escreve `base_metricas_make`. Fim da janela ads/perfil = ontem `America/Sao_Paulo`.

## Visão geral e Relatórios

Não leem as views diárias no browser. Admin JWT chama `getAdminPortfolioFn` → `portfolio_overview(from,to)` + `portfolio_clientes_ativos()` (migrations 56–57). KPI Conversões = `meta_results` + `google_conversions` + `ga4_conversions` (pixel Meta não soma em dobro).

Detalhe do timeout e do plano de produto: [overview-relatorios-timeout-audit.md](../reports/overview-relatorios-timeout-audit.md).

## O que falta para o estágio final

1. Primeiro `workflow_dispatch` (ou noite) dos crons Meta/IG em `main` — Hub até ontem BRT.
2. OAuth Google Ads + developer token — único bloqueio humano para Google/GA4 Hub.
3. 14 dias de paridade medida → pausar cenário Make **por plataforma** (tabela Make não é dropada).

Make legado: [current-pipeline-make.md](./current-pipeline-make.md). Kernel Hub: [13-platform-hub](../13-platform-hub/README.md).
