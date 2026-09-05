---
title: Content Workflow — Fase 2 (Portal Cliente)
description: Especificação e entrega da Fase 2 — experiência cliente em /aprovacoes.
status: completed
owner: Engenharia Lots BI
last_review: 2026-07-06
---

# Content Workflow — Fase 2 (Portal Cliente)

> **Objetivo:** experiência completa do cliente no módulo Aprovações.  
> **Fora de escopo:** Biblioteca, Calendário, Stories, Dashboard ops, migration 20, integrações.

---

## Rota

| URL           | Arquivo                                    |
| ------------- | ------------------------------------------ |
| `/aprovacoes` | `src/routes/_authenticated/aprovacoes.tsx` |

Staff sem `client_access` é direcionado para `/admin/aprovacoes`.

---

## Migration 19

`19_content_workflow_client_phase2.sql`

- ENUM `changes_requested` em `content_card_event_type`
- RLS: cliente pode inserir `commented`, `approved`, `changes_requested`

---

## Server functions (`cards/client-cards.server.ts`)

| Função                    | Descrição                              |
| ------------------------- | -------------------------------------- |
| `getClientKanbanBoardFn`  | Kanban read-only via `client_access`   |
| `getClientContentCard`    | Detalhe + timeline + anexos            |
| `clientCommentCardFn`     | Evento `commented`                     |
| `clientApproveCardFn`     | Evento `approved` (sem alterar status) |
| `clientRequestChangesFn`  | Evento `changes_requested`             |
| `checkClientPortalAccess` | Gate portal cliente                    |

Filtro de segurança: `client_access` no repository (`listForClientNames`).

---

## UI

```
approval/
├── card/ClientCardDetailDrawer.tsx   # read-only + ações aprovar/solicitar
├── preview/SocialPreviewPanel.tsx    # wrapper MediaPreview
└── kanban/* (readOnly prop)          # DnD desabilitado
```

---

## Critérios de aceite ✅

- [x] Cliente vê apenas seus conteúdos (`client_access`)
- [x] Kanban leitura
- [x] Drawer leitura + preview social
- [x] Comentários → `content_card_events`
- [x] Aprovar / solicitar alteração → eventos only
- [x] Timeline atualizada
- [x] `npm run check` verde

---

## Próxima fase

Fase 3 — Pilares, Stories, Calendário. Ver [implementation plan](./content-workflow-implementation-plan.md).
