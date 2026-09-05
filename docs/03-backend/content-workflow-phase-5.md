---
title: Content Workflow — Fase 5 (Consolidação)
description: Descontinuação do legado, redirects, polish UX e encerramento do Content Workflow v3.
status: completed
owner: Engenharia Lots BI
last_review: 2026-07-06
---

# Content Workflow — Fase 5 (Consolidação do Produto)

> **Objetivo:** Consolidar definitivamente o produto — sem novas features, sem mudança de arquitetura.  
> **Status:** ✅ Concluída — desenvolvimento do Content Workflow v3 **encerrado**.

---

## Legado removido

| Item                                                                      | Ação                                |
| ------------------------------------------------------------------------- | ----------------------------------- |
| `src/lib/editorial.functions.ts`                                          | Removido                            |
| `src/routes/_authenticated/admin/editorial.tsx` (MVP)                     | Substituído por redirect permanente |
| `posts_editorial`, `post_media`, `post_revisions`, `post_snapshots`       | Drop migration 22                   |
| Componentes órfãos (`ApprovalWorkflowCard`, `EditorialMediaUpload`, etc.) | Removidos                           |
| `migration-helpers.ts` (mapeamentos legado)                               | Substituído por `workflow-rules.ts` |

---

## Redirects

| De                                   | Para                                               |
| ------------------------------------ | -------------------------------------------------- |
| `/admin/editorial`                   | `/admin/aprovacoes?tab=calendar`                   |
| `/admin/editorial?estrategia=<uuid>` | `/admin/aprovacoes?tab=calendar&estrategia=<uuid>` |

Nav admin: item "Calendário Editorial" removido — único entry point: **Aprovações**.

---

## Migration 22

`22_content_workflow_legacy_deprecation.sql`:

- View `vw_estrategia_editorial_stats` reescrita sobre `content_cards`
- Drop tabelas legado + trigger `posts_editorial_client_guard`
- Drop funções SQL de mapeamento legado (backfill migration 18)

---

## UX padronizada

Componentes compartilhados em `components/lots/approval/shared/`:

| Componente              | Uso                                                    |
| ----------------------- | ------------------------------------------------------ |
| `ApprovalEmptyState`    | Estados vazios (Kanban workspace, pilares, biblioteca) |
| `ApprovalPanelSkeleton` | Loading de painéis                                     |
| `ApprovalConfirmDialog` | Confirmações destrutivas (arquivar card)               |

Melhorias transversais:

- Lazy loading das abas pesadas (Kanban, Calendário, Pilares, Stories, Biblioteca)
- `staleTime` em queries de cliente/pilares/calendário
- `React.memo` no `KanbanBoardView`
- Mensagens de erro consistentes (`toast` + estados inline)
- Deep-link Plano Estratégico → calendário com filtro `estrategia`

---

## Segurança e boundaries

- `validate-approval-boundaries.mjs` estendido: proíbe `editorial.functions` em todo `src/`
- RLS permanece em `content_cards` / eventos / anexos (migrations 18–19)
- Hard delete bloqueado em publicados/arquivados (repository + `workflow-rules.ts` + trigger SQL)

---

## Critérios de aceite

- [x] Nenhuma funcionalidade legada utilizada
- [x] Redirects funcionando
- [x] UX consistente em todo o módulo
- [x] Código limpo (sem TODO/FIXME no módulo)
- [x] `npm run check` verde
- [x] Documentação finalizada

---

## Product Tour (guia rápido)

1. **Admin** → `/admin/aprovacoes` — selecione cliente → abas Kanban | Calendário | Pilares | Stories | Biblioteca
2. **Kanban** — arraste cards entre colunas; clique para abrir drawer (conteúdo, mídia, timeline, comentários)
3. **Calendário** — visão mês/semana/dia sobre `data_publicacao`
4. **Pilares** — estrutura editorial por cliente (cor, objetivo, ordem)
5. **Stories** — planilha de roteiros vinculada a cards
6. **Biblioteca** — conteúdos publicados/arquivados com busca server-side
7. **Dashboard ops** → `/admin/aprovacoes/dashboard` — métricas de tempo por etapa
8. **Cliente** → `/aprovacoes` — mesmo workspace, ações limitadas (aprovar, comentar, visualizar)

---

## Manutenção

Ver [content-workflow-maintenance.md](./content-workflow-maintenance.md).

---

## Encerramento v3

Após esta fase, o Content Workflow v3 está **oficialmente encerrado**. Evoluções futuras (integrações Meta/TikTok, IA, automação) estão no roadmap pós-v1 — fora deste escopo.
