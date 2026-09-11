---
title: GA4 — Dashboard
description: Google Analytics 4 — usuários, sessões, eventos e conversões no Lots BI.
status: living
owner: Engenharia / Dados Lots BI
tags: [dashboard, ga4, platformdef]
difficulty: intermediate
last_review: 2026-09-11
---

# GA4 (Google Analytics 4)

## Origem dos dados

| Item         | Valor                      |
| ------------ | -------------------------- |
| Platform key | `ga4`                      |
| View SQL     | `vw_ga4_diario`            |
| PlatformDef  | `src/lib/platforms/ga4.ts` |
| Ingestão atual | Hub `prefer_hub` (código + cron). Sem OAuth — Make até **2026-08-17**. Wizard esconde GA4 até P14. |

## Métricas oficiais

| Key              | Coluna           | Agregação |
| ---------------- | ---------------- | --------- |
| active_users     | active_users     | sum       |
| sessions         | sessions         | sum       |
| engaged_sessions | engaged_sessions | sum       |
| pageviews        | pageviews        | sum       |
| event_count      | event_count      | sum       |
| conversions      | conversions      | sum       |

## KPIs derivados

Engagement rate (sessões), eventos/sessão, views/user, conv/sessão, conv/user — ver `PlatformDef`.

## Limitações

- Definições de “usuário ativo” e “sessão engajada” seguem o GA4 na origem.
- Atraso de processamento do GA4 pode afetar dados do dia corrente.

## Referências

- [Catálogo de plataformas](../../06-engine/platform-catalog.md)
