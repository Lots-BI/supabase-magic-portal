---
title: Content Workflow — Fase 3 (Planejamento Editorial)
description: Especificação e entrega da Fase 3 — Pilares, Calendário e Plano de Stories.
status: completed
owner: Engenharia Lots BI
last_review: 2026-07-06
---

# Content Workflow — Fase 3 (Planejamento Editorial)

> **Objetivo:** inteligência editorial antes da produção — pilares, calendário e plano de stories.  
> **Fora de escopo:** Biblioteca, Dashboard ops, integrações IA/Meta/TikTok/LinkedIn/Make/n8n, métricas.

---

## Princípio

Todo `ContentCard` nasce com **pilar obrigatório** (`pilar_id`). Kanban e Calendário são visualizações do mesmo aggregate (`content_cards`). Plano de stories usa `story_plan_rows` com vínculo opcional a card.

---

## Migration 20

`20_content_workflow_editorial_planning.sql`

- Triggers `updated_at` em `editorial_pillars` e `story_plan_rows`

---

## Server functions

| Arquivo                              | Funções                                             |
| ------------------------------------ | --------------------------------------------------- |
| `planning/pillars.server.ts`         | CRUD pilares, reordenar, arquivar                   |
| `planning/calendar.server.ts`        | `getCalendarCards` (mês/semana/dia, lazy por range) |
| `planning/stories.server.ts`         | CRUD `story_plan_rows`                              |
| `planning/client-planning.server.ts` | leitura cliente (pilares, calendário, stories)      |

Lifecycle: `internal/pillar-lifecycle.server.ts`, `internal/story-lifecycle.server.ts`.

---

## UI

```
approval/
├── shared/ApprovalWorkspaceTabs.tsx
├── shared/PillarBadge.tsx
├── pillars/EditorialPillarsPanel.tsx
├── calendar/ApprovalCalendar.tsx
└── stories/StoryPlanSheet.tsx
```

Rotas com abas **Kanban | Calendário | Pilares | Stories**:

- Agência: `/admin/aprovacoes`
- Cliente (read-only): `/aprovacoes`

Drawer existente (`CardDetailDrawer` / `ClientCardDetailDrawer`) reutilizado ao clicar em cards.

---

## Critérios de aceite

- [x] CRUD pilares (agência)
- [x] Cards com pilar obrigatório + badge no drawer
- [x] Calendário mês/semana/dia
- [x] Plano de stories (spreadsheet)
- [x] Cliente visualiza tudo (read-only)
- [x] Single source of truth (`content_cards`)
- [x] `npm run check` verde

---

## Próximo passo

Aguardar aprovação para **Fase 4 — Biblioteca + Dashboard ops**.
