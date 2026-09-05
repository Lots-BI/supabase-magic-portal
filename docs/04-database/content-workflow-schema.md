---
title: Content Workflow — Schema
description: Modelo de dados, migrations e RLS do módulo de Workflow de Conteúdo.
status: living
owner: Engenharia Lots BI
last_review: 2026-07-06
---

# Content Workflow — Schema

Migrations oficiais: `supabase/migrations-official/` (aditivas, idempotentes).

---

## Aggregate root: `content_cards`

Domínio oficial. Tipo app: **`ContentCard`**.

### Colunas principais

| Coluna                 | Tipo                  | Propósito                           |
| ---------------------- | --------------------- | ----------------------------------- |
| `id`                   | `uuid` PK             | Identidade do card                  |
| `cadastro_cliente_id`  | `bigint` FK           | Cliente                             |
| `cliente_nome`         | `text`                | Denormalizado (RLS)                 |
| `data_publicacao`      | `date`                | Data planejada                      |
| `hora_publicacao`      | `time`                | Horário                             |
| `titulo`               | `text`                | Título                              |
| `legenda`              | `text`                | Legenda                             |
| `copy_text`            | `text`                | Copy                                |
| `roteiro`              | `text`                | Roteiro                             |
| `direcao_arte`         | `text`                | Direção de arte                     |
| `cta`                  | `text`                | CTA                                 |
| `plataforma`           | `text`                | Rede social                         |
| `formato`              | `text`                | feed, reel, story…                  |
| `status`               | `content_card_status` | Workflow                            |
| `checklist`            | `jsonb`               | `[{ id, label, done }]`             |
| `pilar_id`             | `uuid` FK             | Pilar editorial                     |
| `estrategia_id`        | `uuid` FK             | Plano estratégico (opcional)        |
| `responsavel_user_id`  | `uuid` FK             | Social media                        |
| `kanban_ordem`         | `int`                 | Ordem na coluna                     |
| `published_at`         | `timestamptz`         | Publicação                          |
| `archived_at`          | `timestamptz`         | Arquivamento                        |
| `ai_metadata`          | `jsonb`               | IA futura                           |
| `integration_metadata` | `jsonb`               | IDs externos futuros                |
| `legacy_post_id`       | `uuid`                | Rastreio backfill `posts_editorial` |

### Status (`content_card_status`)

`producao` · `edicao` · `aguardando_aprovacao` · `aprovado` · `publicado` · `arquivado`

---

## Timeline: `content_card_events`

Append-only. **Sem UPDATE. Sem DELETE.** (triggers)

| Coluna                     | Tipo                                        |
| -------------------------- | ------------------------------------------- |
| `card_id`                  | FK → `content_cards` ON DELETE **RESTRICT** |
| `event_type`               | `content_card_event_type`                   |
| `payload`                  | `jsonb`                                     |
| `actor_id` / `actor_email` | auditoria                                   |

---

## Anexos: `content_card_attachments`

| Coluna            | Propósito                          |
| ----------------- | ---------------------------------- |
| `card_id`         | FK RESTRICT                        |
| `kind`            | image, video, pdf, document, audio |
| `media_role`      | preview, attachment                |
| `storage_path`    | bucket `editorial-media`           |
| `legacy_media_id` | backfill `post_media`              |

---

## Pilares: `editorial_pillars`

Por cliente: titulo, objetivo, explicacao, cor, ordem, ativo.

---

## Stories: `story_plan_rows`

Planilha: semana_inicio, dia_semana (0–6), periodo, titulo, observacoes, checklist, `card_id` opcional.

---

## Biblioteca (módulo `library/`)

**Não é tabela.** Submódulo consulta:

```sql
SELECT * FROM content_cards
WHERE status IN ('publicado', 'arquivado')
ORDER BY published_at DESC NULLS LAST;
```

Hard delete bloqueado por trigger em `content_cards`.

---

## Legado (removido na Fase 5)

Tabelas `posts_editorial`, `post_media`, `post_revisions`, `post_snapshots` foram descontinuadas na
migration **22**. Dados migrados na migration 18 permanecem em `content_cards` e tabelas relacionadas.

---

## Migrations

| #      | Arquivo                                      | Fase |
| ------ | -------------------------------------------- | ---- |
| **18** | `18_content_workflow_foundation.sql`         | 0    |
| 19     | `19_content_workflow_client_phase2.sql`      | 2    |
| 20     | `20_content_workflow_editorial_planning.sql` | 3    |
| 21     | `21_content_workflow_ops_views.sql`          | 4    |
| 22     | `22_content_workflow_legacy_deprecation.sql` | 5    |

---

## Referências

- [ADR-0018](../02-architecture/adr/0018-content-workflow-module-v1.md)
- [Fase 0 spec](../03-backend/content-workflow-phase-0.md)
