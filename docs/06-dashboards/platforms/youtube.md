---
title: YouTube — Dashboard
description: Visualizações e impressões do canal no portal do cliente.
status: living
owner: Engenharia / Dados Lots BI
tags: [dashboard, youtube, platformdef]
difficulty: beginner
last_review: 2026-10-21
---

# YouTube

## Origem dos dados

| Item         | Valor                          |
| ------------ | ------------------------------ |
| Platform key | `youtube`                      |
| Leitura      | RPC `dashboard_prefer_hub_long` |
| PlatformDef  | `src/lib/platforms/youtube.ts` |
| Rota cliente | `/cliente/{slug}/youtube`      |

Não há `vw_youtube_diario`. A tela usa `PlatformDashboardPage`. Coleta do canal: Puxar e
cron `GET /api/cron/youtube-channel-sync`. Upload de vídeo fica no fluxo de conexão Google.

## Métricas oficiais

| Key         | Coluna      | Agregação |
| ----------- | ----------- | --------- |
| views       | views       | sum       |
| impressions | impressions | sum       |

KPI: views por impressão.

## Referências

- [Catálogo de plataformas](../../06-engine/platform-catalog.md)
- [Dashboards — visão geral](../dashboards.md)
- [Credenciais Google](../../08-operations/credenciais-google-tiktok-youtube.md)
