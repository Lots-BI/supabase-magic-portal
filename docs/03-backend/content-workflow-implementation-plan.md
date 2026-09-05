---
title: Content Workflow v1 — Plano de Implementação
description: Plano técnico aprovado para o módulo de Workflow de Conteúdo (Aprovações).
status: approved
owner: Engenharia Lots BI
last_review: 2026-07-06
version: 3.0
---

# Content Workflow v1 — Plano de Implementação

> **Status:** Aprovado — kick-off Fase 0 (2026-07-06)  
> **ADR:** [0018](../02-architecture/adr/0018-content-workflow-module-v1.md)  
> **Fase 0 spec:** [content-workflow-phase-0.md](./content-workflow-phase-0.md)

---

## 1. Visão

O **Content Workflow** (UI: **Aprovações**) é o módulo definitivo de produção de conteúdo.
O **Kanban é uma visualização**. O aggregate root oficial é **`ContentCard`** → tabela **`content_cards`**.

`posts_editorial` permanece apenas como legado de migração até o código MVP ser migrado na Fase 1.

---

## 2. Decisões arquiteturais v3 (definitivas)

| Decisão         | Detalhe                                                         |
| --------------- | --------------------------------------------------------------- |
| Aggregate root  | **`content_cards`** (domínio oficial)                           |
| Legado          | `posts_editorial` — backfill source; deprecado na app layer     |
| Fluxo           | UI → Server Fn → Module → **Repository** → Supabase             |
| Timeline        | `content_card_events` append-only (trigger anti UPDATE/DELETE)  |
| Anexos          | `content_card_attachments` (backfill de `post_media`)           |
| Biblioteca      | **Submódulo `library/`** — repositório oficial; sem hard delete |
| IA / Publishers | Ports only — sem implementação Fase 0                           |
| Boundaries      | `validate-approval-boundaries.mjs` no `npm run check`           |

---

## 3. Estrutura de pastas (definitiva)

```
src/modules/approval/
├── index.ts
├── types.ts
├── permissions/
│   ├── types.ts
│   ├── matrix.ts
│   ├── resolve-card-action.ts
│   └── *.test.ts
├── workflow/
│   ├── types.ts
│   ├── status-machine.ts
│   ├── column-config.ts
│   └── *.test.ts
├── cards/
│   ├── types.ts
│   ├── validation.ts
│   ├── repository.server.ts
│   └── cards.server.ts          # Fase 1+
├── events/
│   ├── types.ts
│   ├── validation.ts
│   ├── repository.server.ts
│   └── events.server.ts         # Fase 1+
├── comments/
├── attachments/
├── pillars/
├── stories/
├── calendar/
├── library/                     # módulo Biblioteca (não filtro)
├── dashboard/
├── integrations/
│   ├── ports.ts
│   └── ai-ports.ts
└── services/
    ├── build-kanban-board.ts
    ├── build-card-timeline.ts
    └── compute-stage-durations.ts

scripts/validate-approval-boundaries.mjs
```

Cada subdomínio: `types` · `validation` · `services` · `repository.server.ts` · `*.server.ts` · `index.ts`

---

## 4. Migrations

| #      | Arquivo                                      | Fase  | Escopo                                                                          |
| ------ | -------------------------------------------- | ----- | ------------------------------------------------------------------------------- |
| **18** | `18_content_workflow_foundation.sql`         | **0** | `content_cards`, events, attachments, pillars, stories, RLS, triggers, backfill |
| 19     | `19_content_workflow_client_phase2.sql`      | 2     | `changes_requested`, RLS cliente                                                |
| **20** | `20_content_workflow_editorial_planning.sql` | **3** | triggers `updated_at` pilares/stories                                           |
| 21     | `21_content_workflow_ops_views.sql`          | 4     | views ops, índices adicionais                                                   |

---

## 5. Fases

### Fase 0 — Infraestrutura (ATUAL) ⏳

**Escopo:** apenas base — sem UI final, sem Kanban, sem features visuais novas.

Entregáveis:

- [x] ADR-0018 v3 (content_cards definitivo)
- [x] Documentação KC atualizada
- [ ] Migration `18_content_workflow_foundation.sql`
- [ ] Scaffold `src/modules/approval/` completo
- [ ] Repositories (cards, events, attachments, pillars, stories, library)
- [ ] Services puros + testes (status-machine, permissions, timeline builder)
- [ ] Integration ports (stubs)
- [ ] `validate-approval-boundaries.mjs` + `npm run check`
- [ ] Fix bugs legado editorial.functions (não bloqueante Fase 1)

Ver checklist detalhado: [content-workflow-phase-0.md](./content-workflow-phase-0.md)

### Fase 1 — Core Card + Kanban ✅

- Rota `/admin/aprovacoes`, Kanban DnD, CRUD, drawer, timeline, upload
- Server fns `cards/cards.server.ts` + `internal/*`
- **Não** inclui: migration 19, redirect editorial, portal cliente

### Fase 2 — Cliente + Aprovação ✅

- Portal `/aprovacoes`, migration 19, `client-cards.server.ts`
- Ver [content-workflow-phase-2.md](./content-workflow-phase-2.md)

### Fase 3 — Pilares + Stories + Calendário ✅

- Pilares editoriais, calendário (views mês/semana/dia), plano de stories
- Abas no workspace agência e portal cliente
- Ver [content-workflow-phase-3.md](./content-workflow-phase-3.md)

### Fase 4 — Biblioteca + Dashboard ops ✅

- Ver [content-workflow-phase-4.md](./content-workflow-phase-4.md)

### Fase 5 — Deprecation legado + polish

### Fase 5 — Deprecation legado + polish

---

## 6. Critérios de aceite Fase 0

- [ ] Migration 18 aplicável idempotentemente
- [ ] `src/modules/approval/` scaffold completo com repository pattern
- [ ] Nenhum import `@supabase` fora de `*.repository.server.ts` no módulo
- [ ] Testes Vitest passando (workflow, permissions, services)
- [ ] `validate-approval-boundaries.mjs` no `npm run check`
- [ ] `npm run check` green
- [ ] KC + ADR + Roadmap + Changelog atualizados
- [ ] **Não** iniciar Fase 1

---

## 7. Pendências para Fase 1

- Wire server functions às rotas
- Kanban UI + DnD
- Migrar código legado de `posts_editorial` para `content_cards`
- Role `social_media`
- Upload na criação do card
- Deprecar `editorial.functions.ts`
