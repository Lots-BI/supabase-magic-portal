---
title: Content Workflow — Guia de Manutenção
description: Como operar, estender e depurar o módulo de Aprovações após a Fase 5.
status: active
owner: Engenharia Lots BI
last_review: 2026-07-06
---

# Content Workflow — Guia de Manutenção

## Arquitetura em uma frase

**UI → Server Fn (`*.server.ts`) → `internal/*` → `*.repository.server.ts` → Supabase**

Aggregate root: `content_cards`. Eventos em `content_card_events`. Anexos em `content_card_attachments`.

---

## Onde alterar o quê

| Necessidade                              | Local                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| Nova coluna Kanban / transição de status | `workflow/status-machine.ts`, `workflow/column-config.ts`                   |
| Permissão cliente vs staff               | `permissions/matrix.ts`, RLS migrations                                     |
| Novo tipo de evento na timeline          | enum `content_card_event_type` + migration + `event-type-for-transition.ts` |
| Filtro de biblioteca                     | `library/repositories/library.repository.server.ts`                         |
| Métricas do dashboard ops                | `dashboard/services/build-ops-dashboard.ts`                                 |
| Nova aba no workspace                    | `ApprovalWorkspaceTabs.tsx` + rota `aprovacoes.tsx`                         |
| Componente visual                        | `components/lots/approval/**`                                              |

**Nunca:** importar `@/integrations/supabase` fora de `*.repository.server.ts` no módulo approval.

---

## Validação local

```bash
npm run check
```

Inclui `scripts/validate-approval-boundaries.mjs` — falha se boundaries forem violados.

---

## Migrations

Ordem oficial: `18` → `19` → `20` → `21` → `22`.

Migration 22 remove tabelas legado. **Não reintroduzir** `posts_editorial` / `post_media` / `post_revisions`.

---

## Redirect legado

`/admin/editorial` redireciona permanentemente para `/admin/aprovacoes`. Bookmarks antigos continuam funcionando.

---

## Observabilidade

- Erros de domínio: `throw new Error(message)` nos repositories/lifecycle — propagam para `toast.error` na UI
- Auditoria: `content_card_events` com `actor_id`, `actor_email`, `payload`
- Sem logs `console.*` no módulo — erros visíveis via React Query + Sonner

---

## Testes

Vitest em `src/modules/approval/**/*.test.ts` — workflow, permissions, services, repositories, dashboard.

Ao alterar regras de negócio, atualize ou adicione testes no mesmo submódulo.

---

## Documentação relacionada

- [ADR-0018](../02-architecture/adr/0018-content-workflow-module-v1.md)
- [Arquitetura](../02-architecture/content-workflow.md)
- [Schema](../04-database/content-workflow-schema.md)
- [UI](../05-frontend/content-workflow-ui.md)
- [Fases 0–5](./content-workflow-phase-5.md)
