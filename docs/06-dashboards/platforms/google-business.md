---
title: Google Business — Dashboard
description: Perfil Google Business Profile no portal do cliente.
status: living
owner: Engenharia / Dados Lots BI
tags: [dashboard, google-business, platformdef]
difficulty: beginner
last_review: 2026-10-21
---

# Google Business Profile

## Origem dos dados

| Item         | Valor                                    |
| ------------ | ---------------------------------------- |
| Platform key | `google_business`                        |
| View SQL     | `vw_google_business_diario`              |
| Leitura UI   | RPC `dashboard_prefer_hub_long`          |
| PlatformDef  | `src/lib/platforms/google-business.ts`   |
| Rota cliente | `/cliente/{slug}/google-business`        |

A tela usa `PlatformDashboardPage`. O assistente de conexão lista Google Business.

## Métricas oficiais

profile_views, searches, direction_requests, website_clicks, phone_calls, messages,
photo_views, reviews_count (soma); reviews_rating (média). KPI: ações totais.

## Referências

- [Catálogo de plataformas](../../06-engine/platform-catalog.md)
- [Dashboards — visão geral](../dashboards.md)
