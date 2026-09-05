---
title: Content Workflow — Fase 0 (Infraestrutura)
description: Especificação executável da Fase 0 — scaffold, migration 18, boundaries.
status: completed
owner: Engenharia Lots BI
last_review: 2026-07-06
---

# Content Workflow — Fase 0 (Infraestrutura)

> **Objetivo:** base sólida para todas as fases seguintes.  
> **Fora de escopo:** UI final, Kanban, features visuais, Fase 1+.

---

## Migration 18 — `18_content_workflow_foundation.sql`

### ENUMs

- `content_card_status`: producao, edicao, aguardando_aprovacao, aprovado, publicado, arquivado
- `content_card_event_type`: created, updated, commented, moved, approval_requested, approved,
  rejected, published, archived, attachment_added, attachment_removed, checklist_changed

### Tabelas novas

| Tabela                     | FK principal                                                  |
| -------------------------- | ------------------------------------------------------------- |
| `content_cards`            | `cadastro_clientes`, `editorial_pillars`, `plano_estrategias` |
| `content_card_events`      | `content_cards` ON DELETE RESTRICT                            |
| `content_card_attachments` | `content_cards` ON DELETE RESTRICT                            |
| `editorial_pillars`        | `cadastro_clientes`                                           |
| `story_plan_rows`          | `cadastro_clientes`, `content_cards` (opcional)               |

### Triggers

| Trigger                             | Função                              |
| ----------------------------------- | ----------------------------------- |
| `content_cards_touch`               | `updated_at`                        |
| `content_cards_client_guard`        | cliente só altera status (workflow) |
| `content_cards_prevent_hard_delete` | bloqueia DELETE publicado/arquivado |
| `content_card_events_immutable_*`   | bloqueia UPDATE/DELETE              |

### Backfill (sem lógica app)

1. `posts_editorial` → `content_cards` (preserva UUID em `id` + `legacy_post_id`)
2. `post_media` → `content_card_attachments`
3. `post_revisions` → `content_card_events`
4. Evento `created` para cards sem histórico

### RLS (Fase 0)

Admin ALL · Cliente SELECT + UPDATE restrito em `content_cards` · Events SELECT + INSERT commented

---

## Arquivos TypeScript a criar (Fase 0)

### Core

```
src/modules/approval/
├── index.ts
├── types.ts
```

### Subdomínios (cada um: types, validation, repository.server.ts, index.ts)

```
cards/types.ts
cards/validation.ts
cards/repository.server.ts
cards/index.ts

events/types.ts
events/validation.ts
events/repository.server.ts
events/index.ts

attachments/types.ts
attachments/repository.server.ts
attachments/index.ts

pillars/types.ts
pillars/validation.ts
pillars/repository.server.ts
pillars/index.ts

stories/types.ts
stories/validation.ts
stories/repository.server.ts
stories/index.ts

library/types.ts
library/repository.server.ts
library/index.ts

calendar/types.ts
calendar/repository.server.ts
calendar/index.ts

dashboard/types.ts
dashboard/repository.server.ts
dashboard/index.ts

comments/types.ts
comments/index.ts
```

### Pure services + tests

```
workflow/status-machine.ts
workflow/status-machine.test.ts
workflow/column-config.ts
workflow/index.ts

permissions/matrix.ts
permissions/matrix.test.ts
permissions/resolve-card-action.ts
permissions/resolve-card-action.test.ts
permissions/index.ts

services/build-kanban-board.ts
services/build-kanban-board.test.ts
services/build-card-timeline.ts
services/build-card-timeline.test.ts
services/compute-stage-durations.ts
services/compute-stage-durations.test.ts
services/index.ts
```

### Integration ports (stubs)

```
integrations/ports.ts
integrations/ai-ports.ts
integrations/index.ts
```

### CI

```
scripts/validate-approval-boundaries.mjs
```

### package.json

```json
"validate:approval-boundaries": "node scripts/validate-approval-boundaries.mjs",
"check": "... && npm run validate:approval-boundaries && ..."
```

---

## Regras de boundary (`validate-approval-boundaries.mjs`)

1. Em `src/modules/approval/**`: `@/integrations/supabase` só em `*.repository.server.ts`
2. Rotas não importam `*.repository.server.ts` diretamente
3. `src/modules/approval/**` não importa `src/lib/editorial.functions.ts`
4. Services (`workflow/`, `permissions/`, `services/`) não importam Supabase

---

## Repository pattern — contrato

```typescript
// Exemplo: cards/repository.server.ts
export type ContentCardRepository = {
  findById(supabase: SupabaseClient, id: string): Promise<ContentCard | null>;
  insert(supabase: SupabaseClient, row: ContentCardInsert): Promise<ContentCard>;
  // ...
};
```

Server functions (Fase 1+) orquestram:

```typescript
// cards/cards.server.ts (Fase 1)
.handler(async ({ context, data }) => {
  await assertCanEditCard(context, data.id);
  const card = await contentCardRepository.update(context.supabase, data);
  await contentCardEventRepository.append(context.supabase, { type: "updated", ... });
  return card;
});
```

---

## Validação ao concluir Fase 0

```bash
npm run check
```

Deve passar: validate:engineering, validate:auth-boundaries, validate:approval-boundaries,
lint, test, build.

---

## Pendências Fase 1

Ver [content-workflow-implementation-plan.md](./content-workflow-implementation-plan.md#pendências-para-fase-1).
