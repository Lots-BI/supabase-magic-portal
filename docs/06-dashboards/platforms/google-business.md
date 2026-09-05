---
title: Google Business — Dashboard
description: Status, view e limitações do dashboard Google Business Profile no Lots BI.
status: living
owner: Engenharia / Dados Lots BI
tags: [dashboard, google-business]
difficulty: beginner
last_review: 2026-06-26
---

# Google Business Profile

## Origem dos dados

| Item         | Valor                                            |
| ------------ | ------------------------------------------------ |
| View SQL     | `vw_google_business_diario`                      |
| Rota cliente | `/cliente/{slug}/google-business`                |
| Status       | `PlatformPlaceholder` — sem PlatformDef completo |

## Situação atual

Dados podem existir na view, mas a UI ainda usa placeholder genérico até promoção a cidadão de primeira classe.

## Checklist para dashboard completo

- [ ] Dados estáveis no Make/coletor
- [ ] View SQL validada
- [ ] `PlatformDef` + registry
- [ ] Substituir placeholder por `PlatformDashboardPage`
- [ ] Atualizar catálogo de plataformas

## Referências

- [Catálogo de plataformas](../../06-engine/platform-catalog.md)
- [Dashboards — visão geral](../dashboards.md)
