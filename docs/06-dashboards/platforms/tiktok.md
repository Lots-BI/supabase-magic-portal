---
title: TikTok — Dashboard
description: Campanhas TikTok Ads no portal do cliente.
status: living
owner: Engenharia / Dados Lots BI
tags: [dashboard, tiktok, platformdef]
difficulty: beginner
last_review: 2026-10-21
---

# TikTok

## Origem dos dados

| Item         | Valor                         |
| ------------ | ----------------------------- |
| Platform key | `tiktok`                      |
| Leitura      | RPC `dashboard_prefer_hub_long` |
| PlatformDef  | `src/lib/platforms/tiktok.ts` |
| Rota cliente | `/cliente/{slug}/tiktok`      |
| Campanha     | `campanha`                    |

Não há `vw_tiktok_diario`. A tela usa `PlatformDashboardPage`. Spend do TikTok entra como
moeda, não micros.

## Métricas oficiais

| Key         | Coluna      | Agregação |
| ----------- | ----------- | --------- |
| spend       | spend       | sum       |
| impressions | impressions | sum       |

KPI: CPM (`spend ÷ impressions × 1000`).

## Limitações

A API de anúncios (`ads.read`) coleta campanha. Não publica vídeo no perfil. App e
redirect OAuth ainda são passo humano — [credenciais](../../08-operations/credenciais-google-tiktok-youtube.md).

## Referências

- [Catálogo de plataformas](../../06-engine/platform-catalog.md)
- [Dashboards — visão geral](../dashboards.md)
