---
title: Módulos Admin & Operacionais
description: Telas administrativas, editorial, aprovações, relatórios e debug.
status: living
owner: Engenharia / Produto Lots BI
last_review: 2026-09-11
---

# Módulos Admin & Operacionais

Telas além dos dashboards analíticos padrão. Persona principal: **admin da agência**.

---

## Mapa de rotas admin

```mermaid
flowchart TB
    A["/admin"] --> B["Dashboard executivo"]
    A --> R["/admin/relatorios"]
    A --> CW["/admin/aprovacoes\nContent Workflow"]
    A --> PE["/admin/plano-estrategico"]
    A --> C["/admin/clientes"]
    A --> PH["/admin/conexoes\nPlatform Hub"]
    A --> U["/admin/usuarios"]
    A --> S["/admin/servicos"]
    A --> D["/admin/debug"]
    D --> DV["/admin/debug/views"]
    A --> K["/admin/knowledge"]
    A --> AI["/admin/ai-workspace\n(owner only)"]
```

---

## Dashboard executivo (`/admin`)

| Item    | Detalhe                                     |
| ------- | ------------------------------------------- |
| Arquivo | `admin/index.tsx`                           |
| Dados   | RPC `portfolio_overview` / `portfolio_clientes_ativos` (`getAdminPortfolioFn`) |
| Motor   | `metrics.ts` — `sumOverview`, `overviewConversions` |
| Período | `PeriodSelector` + `resolvePeriod`          |

Visão de portfólio: investimento total, clientes ativos, comparativo de período.

---

## Relatórios (`/admin/relatorios`)

| Item      | Detalhe                                                       |
| --------- | ------------------------------------------------------------- |
| Arquivo   | `admin/relatorios.tsx`                                        |
| Propósito | Hub de relatórios — **não** duplica dashboards                |
| Dados     | Mesma RPC do dashboard executivo |
| Motor     | `metrics.ts` — `aggregateByCliente`, `deriveCtr`, `deriveCpa` |
| Período   | `PeriodToggle` (7/30/90 dias)                                 |

Funcionalidades:

- Lista de clientes com última ingestão e plataformas ativas
- Ranking por investimento / métricas
- Clique na linha abre o **relatório visual** em `/cliente/{slug}/relatorio` (mesmo período)

Relatório do cliente: canvas (heróis, pulso, tiles da marca). Plataforma sem coleta no
recorte não aparece. Ver [operational-report.md](./operational-report.md).

---

## Content Workflow — Aprovações (`/admin/aprovacoes`)

| Item    | Detalhe                                                                                                    |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| Nome UI | **Aprovações**                                                                                             |
| Domínio | Content Workflow (substitui Calendário Editorial)                                                          |
| Módulo  | `src/modules/approval/`                                                                                    |
| Backend | `cards/`, `events/`, `attachments/` server fns                                                             |
| Tabelas | `content_cards`, `content_card_events`, `content_card_attachments`, `editorial_pillars`, `story_plan_rows` |
| Docs    | [content-workflow.md](./content-workflow.md)                                                               |

Workflow completo de produção de conteúdo. **Kanban** é a visualização default; também:
Calendário, Pilares editoriais, Plano de Stories, Biblioteca, Dashboard operacional.

Status: `producao` → `edicao` → `aguardando_aprovacao` → `aprovado` → `publicado` → `arquivado`.

Card = entidade central. Timeline imutável em `content_card_events`.

Legado `/admin/editorial` → redirect para `/admin/aprovacoes`.

Ver [ADR-0018](../02-architecture/adr/0018-content-workflow-module-v1.md).

---

## ~~Editorial~~ (`/admin/editorial`) — REMOVIDO

Redirect permanente para `/admin/aprovacoes`. UI MVP e `editorial.functions.ts` removidos na Fase 5.

## Plano Estratégico (`/admin/plano-estrategico`)

| Item    | Detalhe                                        |
| ------- | ---------------------------------------------- |
| Arquivo | `admin/plano-estrategico.tsx`                  |
| Backend | `strategic-plan.functions.ts`                  |
| Tabelas | `planos_estrategicos` + entidades relacionadas |
| Docs    | [plano-estrategico.md](./plano-estrategico.md) |

Centro de inteligência estratégica: diagnóstico automático, objetivos, estratégias com peso,
hipóteses, oportunidades, decisões, aprendizados, radar e integração editorial.

---

## Aprovações — Portal Cliente (`/aprovacoes`)

| Item    | Detalhe                                                       |
| ------- | ------------------------------------------------------------- |
| Arquivo | `modules/client/components/ClientApprovalWorkspace.tsx`       |
| Persona | **Cliente final** ou **admin em `/cliente/:slug/aprovacoes`** |
| Backend | `modules/client/scoped-portal.functions.ts` → Approval        |

| Rota                        | Modo `ClientScope` |
| --------------------------- | ------------------ |
| `/aprovacoes`               | `client_access`    |
| `/cliente/:slug/aprovacoes` | `slug_context`     |

Portal read-only: Kanban, Calendário, Pilares, Stories, Biblioteca. Cliente comenta, aprova e reprova
(no modo slug, visualização sem ações de aprovação).

---

## Clientes (`/admin/clientes`)

| Rota   | Arquivo              | Função                                     |
| ------ | -------------------- | ------------------------------------------ |
| Lista  | `clientes.index.tsx` | `listClientes`                             |
| Novo   | `clientes.novo.tsx`  | `createCliente`                            |
| Editar | `clientes.$id.tsx`   | `getCliente`, `updateCliente`, integrações |

### Integrações no formulário

Usa `INTEGRATIONS` de `integrations-catalog.ts` para renderizar campos técnicos e status
(`configured` | `partial` | `pre` | `off`).

### `useDirtyBlocker`

Hook em `clientes.$id.tsx` — bloqueia navegação com alterações não salvas.

### Conexões Platform Hub (ficha do cliente)

Seção `ClientHubConnectionsSection` — atalho para conexões do cliente em `/admin/conexoes/:id`.

---

## Platform Hub — Conexões (`/admin/conexoes`)

| Item    | Detalhe                                                                 |
| ------- | ----------------------------------------------------------------------- |
| Módulos | `platform-hub/`, `platform-hub-admin/`, `platform-hub-bridges/`         |
| UI      | `src/components/lots/platform-hub/`                                    |
| Rotas   | index, nova, `:connectionId`, health, migracao, testing, rollout        |
| OAuth   | `/oauth/meta`, `/oauth/google`, `/oauth/tiktok` callbacks               |
| Docs    | [platform-hub-admin.md](./platform-hub-admin.md) · [13-platform-hub/](../13-platform-hub/README.md) |
| Validação | `npm run hub:doctor` (Gate H-02)                                      |

Substituto proprietário do Make para APIs oficiais. RC1: homologação; dashboards ainda em `active_source=make`.

---

## Usuários (`/admin/usuarios`)

| Rota  | Função                             |
| ----- | ---------------------------------- |
| Lista | `listUsersWithRoles`               |
| Novo  | `createUserAccount` (service-role) |

Gerencia papéis (`admin`/`cliente`) e `client_access`.

---

## Serviços (`/admin/servicos`)

Catálogo de serviços contratáveis (`servicos` + `cliente_servicos`).
`listServicos` (autenticado), `upsertServico` / `setClienteServicos` (admin).

---

## Debug (`/admin/debug`, `/admin/debug/views`)

| Rota                 | Server function    | Propósito                       |
| -------------------- | ------------------ | ------------------------------- |
| `/admin/debug`       | `getDebugSnapshot` | Amostra de ingestão por cliente |
| `/admin/debug/views` | `getViewsAudit`    | Security + amostra de cada view |

Ferramentas operacionais de primeira classe. Ver [Runbook](../08-operations/runbook.md).

---

## Knowledge Center (`/admin/knowledge`)

| Item   | Detalhe                                                         |
| ------ | --------------------------------------------------------------- |
| Rotas  | `admin/knowledge/`, `admin/knowledge/$` (splat)                 |
| Código | `src/lib/knowledge-center/`, `src/components/knowledge-center/` |
| Fonte  | `docs/**/*.md` via `import.meta.glob` — auto-discovery          |
| Acesso | Somente admin                                                   |

Centro de conhecimento integrado: navegação estilo GitBook, busca ⌘K, Mermaid, favoritos,
recentes, breadcrumb e TOC. Ver [knowledge-center.md](./knowledge-center.md).

---

## AI Workspace (`/admin/ai-workspace`)

| Item   | Detalhe                                                        |
| ------ | -------------------------------------------------------------- |
| Rotas  | `admin/ai-workspace.tsx`                                       |
| Código | `src/lib/ai-workspace/`, `src/components/ai-workspace/`        |
| Fonte  | Agregação automática de docs, código, migrations, git snapshot |
| Acesso | **Somente Platform Owner** (`isPlatformOwnerEmail`)            |

Dois geradores em cards distintos (v1.2):

| Gerador                             | Uso                                 | Exportação               |
| ----------------------------------- | ----------------------------------- | ------------------------ |
| **Contexto para Editor de Código**  | Cursor, Windsurf, Copilot           | `lots-bi-code-context.*` |
| **Contexto para IA Conversacional** | ChatGPT, Claude, Gemini, Perplexity | `lots-bi-chat-context.*` |

Context Score, busca global, seções expansíveis. Não duplica o Knowledge Center.
Ver [ai-workspace.md](./ai-workspace.md) e [ai-chat-context.md](./ai-chat-context.md).

### `countPostsAguardando`

Implementada em `editorial.functions.ts` mas **não wired** na UI (badge futuro).

---

## Referências

- [API Reference](../03-backend/api-reference.md)
- [Dashboards analíticos](./dashboards.md)
- [Integrações](../07-integrations/integrations.md)
