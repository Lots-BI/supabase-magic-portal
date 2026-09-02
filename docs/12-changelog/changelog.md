---
title: Changelog
description: Histórico de mudanças relevantes do Lots BI (produto, dados e infraestrutura).
status: living
owner: Engenharia Lots BI
last_review: 2026-07-07
---

# Changelog

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/) e
[SemVer](https://semver.org/lang/pt-BR/). Toda mudança visível ao usuário ou relevante para
operação deve gerar uma entrada aqui, **no mesmo PR** (ver
[Doc-as-Code](../09-standards/documentation.md)).

Categorias: `Adicionado`, `Alterado`, `Corrigido`, `Removido`, `Segurança`, `Dados`.

---

## [Não lançado]

### Adicionado

- **Publicações Instagram (2026-09-01):** plugin Platform Hub `instagram_organic`, migration `33_instagram_media_metrics`, rota cliente `/cliente/:slug/publicacoes`, sync manual e bridge `ig_media`. Docs: [instagram-posts.md](../06-dashboards/instagram-posts.md), [meta-instagram-setup.md](../07-integrations/meta-instagram-setup.md). Tutorial admin `15-conexoes-instagram-publicacoes`; client `08-publicacoes-instagram`.

- **Novidades da plataforma (2026-09-02):** rota `/novidades` para clientes e admins; fonte `src/content/platform-news/releases.ts`. Doc: [platform-news.md](../06-dashboards/platform-news.md). README na raiz do repositório.

- **README GitHub (2026-09-02):** `README.md` na raiz com setup, estrutura, deploy e links para docs.

- **Tutorial — Knowledge Center e AI Workspace (2026-07-07):** capítulos admin
  `13-knowledge-center` e `14-ai-workspace`; mapa de menus, atalhos e Aprovações atualizados.
  Docs KC: [knowledge-center.md](../06-dashboards/knowledge-center.md),
  [ai-workspace.md](../06-dashboards/ai-workspace.md).

- **AI Workspace v1.1 — AI Chat Context (2026-07-06):** gerador conversacional em
  `/admin/ai-workspace` para modelos de chat (ChatGPT, Claude, Gemini, Perplexity). Sintetiza
  automaticamente Knowledge Center, ADRs, roadmap, changelog e módulos em 14 seções de linguagem
  natural. Exportação Copiar / MD / TXT / JSON; busca indexada. Docs:
  [ai-chat-context.md](./06-dashboards/ai-chat-context.md).

- **AI Workspace v1 (2026-07-06):** módulo exclusivo Platform Owner em `/admin/ai-workspace`.
  Context Pack automático para IAs — agregação de docs, código, migrations, ADRs, roadmap e
  changelog. Prompt Generator, exportação, busca e Context Score. Docs:
  [ai-workspace.md](./06-dashboards/ai-workspace.md).

- **Content Workflow Fase 5.1 — Integração Portal do Cliente (2026-07-06):** rota contextual
  `/cliente/:slug/aprovacoes` para admin em modo "Ver como cliente". `ClientScopeProvider` resolve
  escopo por `client_access` ou slug → `cadastro_cliente_id`. Adaptação em `modules/client` sem
  alterar domínio Approval. Spec:
  [content-workflow-phase-5-1.md](../03-backend/content-workflow-phase-5-1.md).

- **Content Workflow Fase 5 — Consolidação (2026-07-06):** encerramento do Content Workflow v3.
  Remoção de `editorial.functions.ts`, tabelas legado (`posts_editorial`, `post_media`,
  `post_revisions`, `post_snapshots`) via migration 22. Redirect permanente `/admin/editorial` →
  `/admin/aprovacoes`. UX padronizada (skeletons, empty states, confirmações). Lazy loading das abas.
  Guia de manutenção e Product Tour. Spec:
  [content-workflow-phase-5.md](../03-backend/content-workflow-phase-5.md).

### Removido

- **Editorial MVP legado:** rota `/admin/editorial` (UI), `ApprovalWorkflowCard`, componentes órfãos
  de aprovação legada, selects `POST_*` em `db-selects.ts`.

### Alterado

- **Refinement Sprint v1 — UX e estabilidade (2026-07-07):** skeletons consistentes em
  Aprovações (kanban vazio com CTA, drawers, Story Plan); invalidação React Query mais
  estreita no DnD; `DashboardSkeleton` corrigido no Agency OS; botões `asChild` em listagens
  admin; padding mobile no Kanban; `console.warn` restrito a DEV.

- **AI Workspace v1.2 — UX finalização (2026-07-07):** dois cards distintos (Editor de Código
  vs IA Conversacional); geração sob demanda; loading skeleton; exportação unificada
  (`lots-bi-code-context.*`, `lots-bi-chat-context.*`); footer “Como utilizar este contexto” no
  chat context.

- **Plano Estratégico:** stats editoriais via `content_cards` (`vw_estrategia_editorial_stats`).
  Deep-link "Ver no calendário" aponta para `/admin/aprovacoes?tab=calendar&estrategia=…`.

- **Content Workflow Fase 4 — Biblioteca + Dashboard (2026-07-06):** Biblioteca oficial de
  conteúdos publicados (`library/`) com busca server-side, filtros, paginação, grid/lista/detalhe
  e arquivamento sem hard delete. Dashboard operacional em `/admin/aprovacoes/dashboard` com
  métricas derivadas de `content_card_events`. Migration 21. Ports IA (contratos). Spec:
  [content-workflow-phase-4.md](../03-backend/content-workflow-phase-4.md).

- **Content Workflow Fase 3 — Planejamento Editorial (2026-07-06):** módulo de estratégia antes da
  produção. Pilares editoriais (CRUD, reordenar, arquivar), Calendário editorial (mês/semana/dia
  sobre `content_cards`), Plano de Stories (`story_plan_rows`). Abas em `/admin/aprovacoes` e
  `/aprovacoes` (cliente read-only). `pilar_id` obrigatório em novos cards. Migration 20 (triggers).
  Spec: [content-workflow-phase-3.md](../03-backend/content-workflow-phase-3.md).

- **Content Workflow Fase 2 — portal cliente (2026-07-06):** `/aprovacoes` migrado para
  `content_cards`. Kanban read-only, drawer com preview social (`MediaPreview`), comentários
  ilimitados e ações Aprovar / Solicitar alteração via eventos (`approved`, `changes_requested`).
  Migration 19. Filtro `client_access` no repository. Spec:
  [content-workflow-phase-2.md](../03-backend/content-workflow-phase-2.md).

- **Content Workflow Fase 1 — Kanban interno (2026-07-06):** rota `/admin/aprovacoes` com Kanban
  funcional para agência. DnD entre colunas (`@dnd-kit`), CRUD completo (criar, editar, mover,
  arquivar, duplicar), drawer lateral com timeline via `content_card_events`, upload de anexos.
  Server functions em `modules/approval/cards/cards.server.ts`. Legado `posts_editorial` e
  `/admin/editorial` **mantidos** — sem redirect ainda. Spec:
  [content-workflow-phase-1.md](../03-backend/content-workflow-phase-1.md).

- **Content Workflow Fase 0 — infraestrutura (2026-07-06):** domínio oficial **`content_cards`**
  (aggregate root). Repository pattern (UI → Server Fn → Service → Repository → Supabase).
  Migration 18, `validate-approval-boundaries.mjs`, ports stubs. Spec:
  [content-workflow-phase-0.md](../03-backend/content-workflow-phase-0.md).

- **Content Workflow Module v1 — arquitetura aprovada (refinamento 2026-07-05):** módulo
  definitivo de Workflow de Conteúdo (UI: Aprovações). Documentação:
  [ADR-0018](../02-architecture/adr/0018-content-workflow-module-v1.md),
  [content-workflow.md](../02-architecture/content-workflow.md),
  [plano de implementação](../03-backend/content-workflow-implementation-plan.md).

- **Recovery Mode — decisão operacional (pós Auth Module v3):** workaround oficial documentado
  para usuários em `invite_pending` quando **Reenviar convite** não dispara novo e-mail
  (excluir → recriar pelo painel admin). Ver
  [Known Operational Limitation — Recovery Mode (v3)](../03-backend/auth-module-v3.md#known-operational-limitation--recovery-mode-v3).
- **Migration 17 (`17_fix_invalidate_sessions_uuid_cast.sql`):** corrige
  `operator does not exist: character varying = uuid` na RPC `access_invalidate_auth_sessions`.
- **Auth Module v3 — encerramento oficial:** separação Auth / Access / Admin; orchestrator;
  boundary validation no CI; Recovery Mode; documentação completa no Knowledge Center
  ([auth-module-v3.md](../03-backend/auth-module-v3.md),
  [auth-access-admin.md](../02-architecture/auth-access-admin.md),
  [ADR-0014](../02-architecture/adr/0014-auth-module-v3-architecture.md)).
- **Sprint de performance:** `manualChunks` no Vite (react, supabase, recharts, mermaid, fuse…),
  `QueryClient` com `staleTime`/`gcTime`, lazy load de Recharts (`AreaChartLotusLazy`), registry
  do KC assíncrono, `db-selects.ts` para payloads menores, `React.memo` em `StatCard`.
- **Sprint de responsividade:** plataforma utilizável em 320–768px — drawer mobile no `AppShell`
  e no KC, touch targets (44px), sheets/dialogs com safe-area iOS, KPI grids adaptativos,
  formulários e drawers do editorial/plano/aprovações revisados.

### Alterado

- **Recovery Mode:** reduzido a 3 ações operacionais diárias — reenviar convite, enviar
  redefinição de senha, excluir usuário. Removidas ações auxiliares (invalidar sessões, reativar,
  revogar, desativar) do painel administrativo.
- **Knowledge Center (Auth Module v3):** documentação atualizada com comportamento atual do Recovery
  Mode, limitação operacional conhecida e item de evolução futura no Roadmap.
- **Auth & Access:** refactor completo — `src/modules/auth`, `src/modules/access`, `src/modules/admin`;
  rotas `/auth` thin adapters; convite/recovery sem auto-login; migrations 13–16 documentadas.
- **Plano Estratégico — conceito contínuo:** um plano ativo por cliente; evolução por
  objetivos sucessivos (não múltiplos planos). Dashboard centrado no objetivo atual, histórico
  (ativos/concluídos/cancelados), onboarding do primeiro objetivo, estratégias/hipóteses/roadmap
  vinculados ao objetivo. Migration aditiva `12_plano_objetivo_scope.sql`.
- **Migration 05 (`vw_clientes_admin`):** recriação da view com `DROP VIEW` + `CREATE VIEW`
  (não `CREATE OR REPLACE` ao inserir colunas no meio — Postgres erro `42P16`).
- **Knowledge Center:** drawer de índice no mobile; documentação atualizada (este changelog,
  migrations, troubleshooting, módulo KC).

### Corrigido

- **AI Workspace — startup:** removido `router.invalidate()` em `SIGNED_IN` que causava erro
  esporádico ao abrir a plataforma; bootstrap Supabase aguardado em `_authenticated`.

- **`column vw_clientes_admin.tiktok_ativo does not exist`:** select explícito pedia colunas da
  migration 05 antes dela estar em produção; `listClientes`/`getCliente` voltaram a `select("*")`
  até o banco estar alinhado (após aplicar `05_cadastro_clientes_make_ids.sql`).
- **Dashboard admin (`/admin`):** `AreaChartLotusLazy` usado sem import — `ReferenceError` ao
  renderizar gráfico de evolução quando havia dados no período.
- **`getCliente`:** restaurado `.eq("id", data.id)` removido acidentalmente na sprint de performance.
- **Sintaxe em server functions:** `EDITORIAL_BUCKET`, `;` faltando em selects Supabase
  (`admin.functions.ts`, `strategic-plan.functions.ts`).
- **Plano Estratégico — navegação cliente:** rota pai `plano-estrategico` convertida em layout
  (`<Outlet />`); listagem em `index.tsx`; Centro Estratégico em `$planoId.tsx`. Corrige página
  vazia ao abrir `/cliente/:cliente/plano-estrategico/:planoId`.
- **Admin debug:** mesmo padrão layout + index; `/admin/debug/views` volta a renderizar como filho.
- **Admin permanente do dono:** `has_role` reconhece `leandromajr@gmail.com`, auto-reparo no login
  (`owner-admin.ts`) e migration `09_owner_admin_guard.sql` reforçada.

### Adicionado

- **Plano Estratégico (Centro de Inteligência):** módulo completo com diagnóstico automático,
  radar executivo, objetivos, hipóteses, estratégias com peso %, oportunidades, roadmap, decisões,
  aprendizados, próximos passos, timeline colaborativa e integração editorial (`estrategia_id`).
  Migration `11_plano_estrategico.sql`, ADR-0013, docs em `06-dashboards/plano-estrategico.md`.
- **Refinamento SaaS (camada app):** `MetricLabel`, tooltips em todos os KPIs (`METRIC_META`),
  `EmptyState`, `DashboardSkeleton`, `SyncStatusBar`, `GlobalSearch` (Ctrl+K),
  `NotificationCenter`, workflow de aprovações com preview ampliável e timeline,
  fallbacks de logo/favicon via CDN Supabase.
- **Rebranding Lots BI:** nova identidade visual (logo, favicon, og-image, cores `#A855F7` → `#60A5FA`),
  metadados, títulos de aba, login e assets em `public/brand/`.
- **Knowledge Center:** módulo admin `/admin/knowledge` — renderiza `docs/**/*.md` com busca,
  navegação colapsável, Mermaid, favoritos, recentes e metadados YAML. Documentação de
  plataformas em `06-dashboards/platforms/`.
- **Setup interno:** `SETUP.md`, `npm run setup`, ADR-0012, deploy Cloudflare manual
  (`deploy.yml`, `npm run deploy:cloudflare`), `error-reporting.ts` genérico.
- **Segurança:** `.env` adicionado ao `.gitignore`.

### Alterado

- **Pronto para clientes:** rotas `/cliente/{slug}` corrigidas (slugify), login somente por convite,
  barra de sync, tooltips em KPIs, workflow de aprovações, pesquisa global e central de notificações.
- **Sistema de Engenharia fundado (ADR-0011):** CI, Vitest, CONTRIBUTING, governança, `npm run check`.
- **Deployment & Padrões:** Lovable transitório (build/deploy); Cursor como dev oficial.

### Adicionado (sistema de engenharia)

- **CI:** `.github/workflows/ci.yml` — lint, test, build, validate
- **Testes:** Vitest + `formulas.test.ts`, `period.test.ts`
- **Governança:** `CONTRIBUTING.md`, PR template, `governance.md`, `engineering-system.md`
- **Automação:** `scripts/validate-engineering.mjs`, `npm run check`
- **`.gitattributes`** + Prettier LF
- **ADR-0011** — Fundação do Sistema de Engenharia
- **Regra Cursor:** `lotus-governance.mdc`

### Adicionado (auditoria CTO)

- **Auditoria de completude** (`docs/AUDIT.md`) — matriz cobertura, lacunas L1–L9, roteiro sênior 4h.
- **Auth & Segurança:** `03-backend/auth.md`, `security.md`.
- **RLS:** catálogo completo de policies (`04-database/rls-policies.md`).
- **Engine:** seção `06-engine/` (overview, platform-catalog, formulas, period, overview-aggregation).
- **Admin:** módulos operacionais (`06-dashboards/admin-modules.md`).
- **Ops:** environments, cicd, observability, troubleshooting.
- **Padrões:** testing strategy, code-organization.
- **Frontend:** repository-structure, observability-errors.
- **`.env.example`** na raiz do projeto.
- Procedimento manual de migrations documentado.

### Adicionado

- **Fluxo oficial de desenvolvimento:** Cursor como ambiente de engenharia; Lovable rebaixado
  a build/deploy transitório.
- **ADR-0010:** Cursor como ambiente oficial de engenharia.
- **`.cursor/rules/lotus-engineering.mdc`:** regras de qualidade, arquitetura e Definition of Done.
- **`docs/09-standards/development-workflow.md`:** pipeline Dev → Git → GitHub → Deploy.
- **START HERE** (`docs/START_HERE.md`): ponto de entrada principal do handbook (< 1h).
- **Estado atual vs arquitetura alvo:** documentos dedicados em `02-architecture/`.
- **Missão & Visão Estratégica** (`00-company/mission.md`).
- **Modelo de métricas** (`04-database/metrics-model.md`): oficiais vs derivadas + gap atual.
- **Pipeline Make (transitório)** e **Coletores alvo** (`07-integrations/`).
- **ADRs 0007–0009:** métricas na app, coletores proprietários, infra proprietária.
- **Roadmap expandido** (Fases 4–6: coletores, motor de métricas, infra proprietária).
- **Centro de Conhecimento da Lotus** (`docs/`): handbook completo com ADRs, diagramas,
  runbook, onboarding e regra Cursor para manutenção contínua.

---

## Histórico reconstruído (a partir das migrations)

> As datas abaixo não estão registradas no repositório; a ordem segue a numeração das
> migrations em `supabase/migrations-official/`.

### Dados / Segurança

- **08 — Aliases e guarda de NULL.** Tabela `cliente_aliases` + `COALESCE` para nome canônico
  nas views; exclusão de `valor NULL`. Corrige dashboards vazios/duplicados por divergência de
  nome. Ver [ADR-0004](../02-architecture/adr/0004-chave-de-cliente-por-nome-e-aliases.md).
- **07 — Correção de dashboards vazios.** Views recriadas como `SECURITY DEFINER`. Ver
  [ADR-0003](../02-architecture/adr/0003-views-security-definer.md).
- **06 — Calendário editorial.** Tabelas `posts_editorial`/`post_revisions`, enums e RLS.
- **05 — IDs técnicos do Make.** Colunas de integração em `cadastro_clientes` (substitui a 04,
  deprecada).
- **03 — Extensão de cadastro.** Colunas comerciais, `servicos`, `cliente_servicos`,
  `vw_clientes_admin`.
- **02 — Views analíticas (1ª versão).** Conversão de micros do Google Ads; pivots por
  plataforma.
- **01 — Auth, papéis e acesso.** `profiles`, `user_roles`, `has_role`, `client_access`,
  `current_user_clientes`.

---

## Como adicionar uma entrada

1. Em todo PR com mudança relevante, adicione um bullet na seção **[Não lançado]**, na
   categoria certa.
2. Referencie o ADR/issue quando aplicável.
3. Ao "lançar", renomeie **[Não lançado]** para `[vX.Y.Z] - AAAA-MM-DD` e abra uma nova
   seção **[Não lançado]** no topo.
