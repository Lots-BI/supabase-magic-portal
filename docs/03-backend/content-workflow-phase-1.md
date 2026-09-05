---
title: Content Workflow — Fase 1 (Kanban interno)
description: Especificação e entrega da Fase 1 — Kanban admin, CRUD, drawer, timeline, upload.
status: completed
owner: Engenharia Lots BI
last_review: 2026-07-06
---

# Content Workflow — Fase 1 (Kanban interno)

> **Objetivo:** primeira versão funcional do módulo Aprovações para uso interno da agência.  
> **Fora de escopo:** Portal cliente, Biblioteca, Calendário, Stories, Dashboard ops, migration 19/20.

---

## Rota

| URL                 | Arquivo                                          |
| ------------------- | ------------------------------------------------ |
| `/admin/aprovacoes` | `src/routes/_authenticated/admin/aprovacoes.tsx` |

Nav admin + GlobalSearch (`Ctrl+K`). Legado `/admin/editorial` e `/aprovacoes` **inalterados**.

---

## Server functions (`cards/cards.server.ts`)

| Função                                                  | Descrição                       |
| ------------------------------------------------------- | ------------------------------- |
| `getKanbanBoard`                                        | Board por `cadastro_cliente_id` |
| `getContentCard`                                        | Detalhe + timeline + anexos     |
| `createCard` / `updateCard`                             | CRUD                            |
| `moveCard`                                              | Status machine + evento         |
| `archiveCard` / `duplicateCard`                         | Lifecycle                       |
| `commentCard`                                           | Evento `commented`              |
| `uploadCardMedia` / `deleteCardMedia` / `listCardMedia` | Anexos                          |
| `listEditorialPillars`                                  | Pilares do cliente              |
| `checkIsStaff`                                          | Gate admin / social_media       |

Fluxo: **UI → Server Fn → `internal/*` → Repository → Supabase**

---

## UI (`src/components/lots/approval/`)

```
kanban/   KanbanBoard, KanbanColumn, KanbanCard, MobileStatusPicker, kanban-meta
card/     CardDetailDrawer, CardCreateSheet, CardTimeline, CardMediaUpload
```

- DnD: `@dnd-kit/core` — persistência otimista + `moveCard`
- Fallback mobile: `MobileStatusPicker` no drawer
- Tokens CSS: `--cw-col-*` em `src/styles.css`

---

## Permissões (Fase 1)

| Papel        | Acesso                                       |
| ------------ | -------------------------------------------- |
| Admin        | Total                                        |
| Social Media | Total (app layer; RLS migration 19 pendente) |
| Cliente      | Nenhum nesta fase                            |

---

## Critérios de aceite ✅

- [x] Kanban funcionando
- [x] Drag and Drop (+ fallback mobile)
- [x] CRUD completo (sem hard delete)
- [x] Drawer funcional
- [x] Timeline via `content_card_events`
- [x] Upload funcionando
- [x] Workflow + eventos automáticos
- [x] `npm run check` verde

---

## Próxima fase

Fase 2 — Portal cliente + fluxo de aprovação. Ver [implementation plan](./content-workflow-implementation-plan.md).
