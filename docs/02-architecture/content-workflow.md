---
title: Content Workflow — Arquitetura
description: Visão arquitetural do módulo de Workflow de Conteúdo (Aprovações) da Lots BI.
status: living
owner: Engenharia Lots BI
last_review: 2026-07-06
---

# Content Workflow — Arquitetura

> **Nome visível:** Aprovações · **Módulo:** `approval` · **ADR:** [0018](./adr/0018-content-workflow-module-v1.md)

O **Content Workflow** é o módulo definitivo de produção de conteúdo. O Kanban é uma
**visualização**. O aggregate root é **`ContentCard`** persistido em **`content_cards`**.

---

## Princípios

1. **Card-first** — tudo orbita `content_cards`
2. **Repository pattern** — Supabase só em `*.repository.server.ts`
3. **Event sourcing lite** — `content_card_events` imutável
4. **Biblioteca como módulo** — `library/`; não é filtro
5. **Ports para futuro** — IA, publishers, automação
6. **Boundaries no CI** — `validate-approval-boundaries.mjs`

---

## Fluxo de camadas

```mermaid
flowchart TB
  UI["Rotas finas\n/aprovacoes"]
  SF["Server Function\ncreateServerFn"]
  MOD["Module Service\nworkflow / permissions"]
  REPO["Repository\n*.repository.server.ts"]
  DB["Supabase\ncontent_cards + RLS"]

  UI --> SF --> MOD --> REPO --> DB
```

---

## Aggregate root

```mermaid
flowchart TB
  Card["content_cards\nContentCard"]
  Card --> Events["content_card_events"]
  Card --> Attach["content_card_attachments"]
  Card --> Checklist["checklist jsonb"]
  Card --> Pillar["editorial_pillars"]
  Card --> Stories["story_plan_rows"]
  Card --> AiMeta["ai_metadata"]
  Card --> IntMeta["integration_metadata"]
  Card --> Lib["library/ module"]
```

---

## Superfícies

| View          | Submódulo              | Default |
| ------------- | ---------------------- | ------- |
| Kanban        | `cards/` + `workflow/` | Sim     |
| Calendário    | `calendar/`            | Admin   |
| Pilares       | `pillars/`             | Tab     |
| Stories       | `stories/`             | Tab     |
| Biblioteca    | `library/`             | Tab     |
| Dashboard ops | `dashboard/`           | Admin   |

Todas leem **`content_cards`** — zero duplicação.

---

## Legado

`posts_editorial` / `post_media` / `post_revisions` existem apenas para migração e código MVP
até Fase 1. Novo código usa exclusivamente `content_cards` e tabelas do domínio oficial.

---

## Referências

- [Backend](../03-backend/content-workflow.md)
- [Fase 0](../03-backend/content-workflow-phase-0.md)
- [Schema](../04-database/content-workflow-schema.md)
