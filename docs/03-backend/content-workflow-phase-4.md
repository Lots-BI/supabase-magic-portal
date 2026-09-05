---
title: Content Workflow — Fase 4 (Biblioteca + Dashboard)
description: Especificação e entrega da Fase 4 — repositório oficial e métricas operacionais.
status: completed
owner: Engenharia Lots BI
last_review: 2026-07-06
---

# Content Workflow — Fase 4 (Biblioteca + Dashboard)

> **Objetivo:** Biblioteca de Conteúdo como repositório oficial + Dashboard operacional da agência.  
> **Fora de escopo:** integrações Meta/TikTok/LinkedIn, IA, Make/n8n, métricas de redes, relatórios executivos.

---

## Biblioteca

Submódulo: `src/modules/approval/library/`

| Camada             | Arquivos                                                                   |
| ------------------ | -------------------------------------------------------------------------- |
| Types / validators | `library/types/`, `library/validators/`                                    |
| Repository         | `repositories/library.repository.server.ts` — busca server-side paginada   |
| Query / lifecycle  | `internal/library-query.server.ts`, `internal/library-lifecycle.server.ts` |
| Server fns         | `library.server.ts`, `client-library.server.ts`                            |
| UI                 | `components/lots/approval/library/*`                                      |

### Regras

- Entrada automática: `status = publicado` → `published_at` (lifecycle existente)
- Arquivar conteúdo: `archiveLibraryContent` — mantém `published_at`, define `archived_at`, status `arquivado`
- Hard delete bloqueado: repository + lifecycle + trigger SQL (migration 18)
- Busca/filtros server-side (nunca em memória)
- Views: grid / lista (preferência em `localStorage`) + detalhe em drawer

### Portal cliente

- Aba Biblioteca em `/aprovacoes` — read-only + download de anexos

---

## Dashboard operacional

Submódulo: `src/modules/approval/dashboard/`

| Camada    | Arquivos                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------- |
| Types     | `dashboard/types/dashboard.ts`                                                                  |
| Service   | `dashboard/services/build-ops-dashboard.ts` — `aggregateStageAverages`, `computeStageDurations` |
| Query     | `internal/dashboard-query.server.ts`                                                            |
| Server fn | `dashboard.server.ts` → `getApprovalOpsDashboard`                                               |
| UI        | `/admin/aprovacoes/dashboard`, `OpsDashboardPanel.tsx`                                          |

Métricas derivadas de `content_card_events` via `computeStageDurations()`.

Estrutura preparatória: SLA, Lead Time, Cycle Time, tempo por colaborador (`metricsFramework`).

---

## Migration 21

`21_content_workflow_ops_views.sql` — índices biblioteca/ops, views `vw_content_workflow_library`, `vw_content_workflow_ops_status`.

---

## Ports IA (contratos apenas)

`integrations/content-intelligence-ports.ts`:

- `ContentSearchPort`
- `ContentRecommendationPort`
- `TrendAnalysisPort`

---

## Critérios de aceite

- [x] Biblioteca funcionando (grid, lista, detalhe, filtros, paginação)
- [x] Entrada automática publicados
- [x] Arquivamento biblioteca
- [x] Hard delete bloqueado
- [x] Dashboard operacional
- [x] Métricas via events
- [x] Cliente read-only
- [x] `npm run check` verde

---

## Próximo passo

Aguardar aprovação para **Fase 5 — Deprecation legado + polish**.
