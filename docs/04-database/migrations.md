---
title: Banco — Migrations
description: Histórico, convenções e princípios das migrations do Lots BI.
status: living
owner: Engenharia Lots BI
last_review: 2026-09-11
---

# Migrations

As migrations vivem em `supabase/migrations-official/` e seguem três princípios inegociáveis:

1. **Aditivas** — só adicionam (colunas, tabelas, views, índices). Nunca `DROP`/`RENAME`/
   `ALTER TYPE`/`DELETE` em estruturas legadas.
2. **Idempotentes** — re-executáveis com segurança (`IF NOT EXISTS`, `CREATE OR REPLACE`,
   `DO $$ ... EXCEPTION WHEN duplicate_object`).
3. **Autoexplicativas** — comentam a causa-raiz e, quando útil, trazem passos de validação.

---

## Histórico

| Arquivo                                   | O que faz                                                                                                                                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01_auth_roles_access.sql`                | `profiles` + trigger `handle_new_user`; enum `app_role`; `user_roles`; `has_role`; `client_access`; `current_user_clientes` (1ª versão); índices em `base_metricas`.                                          |
| `02_views_metricas.sql`                   | 1ª versão das views analíticas (com `security_invoker = on`). Conversão de micros do Google Ads.                                                                                                              |
| `03_cadastro_clientes_extensao.sql`       | Colunas aditivas em `cadastro_clientes`; RLS; `servicos` + seed; `cliente_servicos`; `vw_clientes_admin`.                                                                                                     |
| `05_cadastro_clientes_make_ids.sql`       | IDs técnicos consumidos pelo Make (instagram/meta/google/ga4/tiktok); recria `vw_clientes_admin` com **`DROP VIEW` + `CREATE VIEW`** (não `OR REPLACE` no meio da lista de colunas).                          |
| `06_editorial.sql`                        | Enums e tabelas do editorial (`posts_editorial`, `post_revisions`) + RLS.                                                                                                                                     |
| `07_views_fix_security_invoker.sql`       | **Correção de dashboards vazios:** recria views como `SECURITY DEFINER`. Ver [ADR-0003](../02-architecture/adr/0003-views-security-definer.md).                                                               |
| `08_aliases_e_null_guard.sql`             | `cliente_aliases` + `COALESCE` para nome canônico; guarda de `valor NULL`; recria views derivadas. Ver [ADR-0004](../02-architecture/adr/0004-chave-de-cliente-por-nome-e-aliases.md).                        |
| `09_owner_admin_guard.sql`                | Admin permanente do dono da plataforma (`has_role` + trigger de bootstrap).                                                                                                                                   |
| `10_editorial_media.sql`                  | `post_media`, bucket `editorial-media`, snapshots.                                                                                                                                                            |
| `11_plano_estrategico.sql`                | Plano Estratégico — tabelas, RLS colaborativa, FK `posts_editorial.estrategia_id`, view `vw_estrategia_editorial_stats`. Ver [ADR-0013](../02-architecture/adr/0013-plano-estrategico-centro-estrategico.md). |
| `12_plano_objetivo_scope.sql`             | Escopo por objetivo no plano (estratégias/hipóteses/roadmap vinculados ao objetivo atual).                                                                                                                    |
| `13_access_management.sql`                | Módulo Auth + Gestão de Acessos v2.1: `access_accounts` (lifecycle), `access_audit_log`, `system_metadata` (`AUTH_MODULE_VERSION=2.1`), trigger em `auth.users`, backfill idempotente.                        |
| `14_access_lifecycle_fix.sql`             | Backfill lifecycle: usuários `active` sem onboarding → `invite_pending` / `awaiting_password`.                                                                                                                |
| `15_auth_invalidate_sessions.sql`         | RPC `access_invalidate_auth_sessions` — revoga sessões Auth por `user_id` (Recovery Mode).                                                                                                                    |
| `16_lifecycle_invite_expired_removal.sql` | Dados legados `invite_expired` → `invite_pending` (Auth Module v3).                                                                                                                                           |
| `28_platform_hub.sql`                     | Platform Hub RC1 — `ph_connections`, `ph_credentials`, `ph_identities`, `ph_sync_runs`, `ph_timeline_events`, `ph_oauth_states`. Ver [Platform Hub](../13-platform-hub/README.md).                            |
| `29_platform_hub_homologation.sql`        | Homologação — `ph_homologation_reports`, `ph_debug_traces`, `ph_comparison_reports`.                                                                                                                          |
| `30_parallel_metricas_homologation.sql`   | Paralelismo métricas — `base_metricas_hub`, `ph_metricas_source`, `vw_metricas` com fonte configurável (`make` default).                                                                                      |
| `31_plano_alinhamento.sql`                | Funil inteligente 1:1 — `plano_alinhamentos` (quiz → proposta → aprovação), RLS por `current_user_clientes`, trigger de guarda de colunas comerciais.                                                      |
| `33_instagram_media_metrics.sql`          | Métricas por publicação Instagram — `ig_media`, `ig_media_metrics_history`, view `vw_ig_media_dashboard`, bucket `ig-media-thumbs`, RLS. Ver [instagram-posts.md](../06-dashboards/instagram-posts.md). |
| `34_instagram_profile_prefer_hub.sql`     | `vw_instagram_diario` passa a preferir `base_metricas_hub` por dia+cliente (via `vw_instagram_normalizada_prefer_hub`), fallback Make. Só recria views. Ver [instagram.md](../06-dashboards/platforms/instagram.md). |
| `35_cliente_diretrizes.sql`            | PDF de diretrizes da marca por cliente — tabela `cliente_diretrizes`, bucket `diretrizes-marca`, RLS admin/cliente. |
| `36_meta_ads_prefer_hub.sql`              | `vw_meta_ads_diario` passa a preferir `base_metricas_hub` por dia+cliente (via `vw_meta_ads_normalizada_prefer_hub`), fallback Make. Mesma receita da 34, com dimensão `campanha`. Só recria views. Ver [meta-ads.md](../06-dashboards/platforms/meta-ads.md). |
| `37_meta_ads_results_conversions.sql`     | Acrescenta `results` e `conversions` em `vw_meta_ads_diario` (colunas no fim). Coletor oficial passa a pedir `actions` + `conversions` na Insights API. |
| `46_meta_instagram_extra_insight_metrics.sql` | Métricas extras Meta/IG no envelope Hub (impressões, alcance, etc. além do núcleo). |
| `47_meta_ads_prefer_hub_ignore_empty_markers.sql` | Sentinela Hub `campanha=''` + results/conversions 0 **não** esconde Make. |
| `48_base_metricas_hub_natural_key.sql`    | Unique natural + RPC `replace_hub_metric_days` (replace-by-day; nunca escreve Make). |
| `49_google_ads_prefer_hub.sql`            | `vw_google_ads_diario` prefer_hub; spend Hub `/ 1e6`. |
| `50_ga4_prefer_hub.sql`                   | `vw_ga4_diario` prefer_hub. |
| `51_views_security_invoker.sql`           | Views `vw_*` restantes com `security_invoker = true`. |
| `52_base_metricas_make_schema.sql`        | Espelho versionado de `base_metricas_make` (sem migrar dados). |
| `53_app_notifications.sql`                | `app_notifications` (notificações server-side). |
| `54_overview_prefer_hub_and_make_rls.sql` | SELECT autenticado no Make + `vw_metricas` prefer_hub (overview deixa de ficar vazio). |
| `55_overview_query_timeout.sql`           | `current_user_clientes()` plpgsql; tentativa MATERIALIZED (substituída pela 56). |
| `56_portfolio_overview_single_pass.sql`   | Overview 1-pass FILTER; RPC `portfolio_overview` / `portfolio_clientes_ativos`. |
| `57_overview_paid_conversions.sql`        | Colunas no fim: `meta_results`, `meta_conversions`, `google_conversions`. |
| `58_meta_ads_messaging_metrics.sql`       | `vw_meta_ads_diario`: `messaging_conversations_started`, `messaging_first_replies`, `page_engagements` no **fim**. WhatsApp do Gerenciador. |
| `59_ig_media_link_content_cards.sql`      | Liga publicações IG a `content_cards`. |
| `60_dashboard_prefer_hub_rpc.sql`         | RPC `dashboard_prefer_hub_long` + `dashboard_coverage`: dashboards filtram cliente+data nas tabelas base (sem varrer o portfólio nas views diárias). |
| `61_crm_people_graph.sql`                 | CRM de audiência: pessoas, identidades, sinais, stats, notas, cobertura. View `vw_crm_people_list`. |
| `62_crm_inbox.sql`                        | Dono, merge (`merged_into_id`), recibos de webhook Meta, view com `last_kind`. |

> Conteúdos (38–45) e demais arquivos em `supabase/migrations-official/` seguem a mesma
> numeração. Lista completa no diretório. **Não existe `04`.** A tentativa
> `04_integracoes_make.sql` foi deprecada e substituída pela `05`.

---

## Convenções ao escrever uma migration nova

- Numere sequencialmente (`09_...`, `10_...`) com nome descritivo em snake_case.
- Comece com um cabeçalho comentando: objetivo, o que **não** altera, e por quê.
- Use guardas de idempotência:
  ```sql
  ALTER TABLE public.x ADD COLUMN IF NOT EXISTS y text;
  CREATE TABLE IF NOT EXISTS public.z (...);
  -- Views com colunas novas NO MEIO da lista: DROP + CREATE (não OR REPLACE — erro 42P16)
  DROP VIEW IF EXISTS public.vw_exemplo;
  CREATE VIEW public.vw_exemplo AS ...;
  DO $$ BEGIN CREATE TYPE ... ; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  ```
- Sempre conceda os GRANTs corretos (`authenticated`, `service_role`) e habilite RLS +
  policies ao criar tabelas.
- Se a mudança recria uma view, recrie também as views dependentes (Postgres pode invalidá-las).
- Inclua um bloco de **validação manual** comentado ao final (ver exemplo na 08).

> Fluxo manual documentado abaixo. Automatizar via CI é item do [Roadmap](../11-roadmap/roadmap.md).

---

## Como aplicar migrations (procedimento manual)

Projeto Supabase: `ywvhoctcmibjitvwkkhb`.

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor.
2. Execute cada arquivo em **ordem numérica** (`01` → `57`).
3. Cada migration é idempotente — re-executar é seguro (exceto editar arquivo já aplicado).
4. Ao final de cada arquivo, rode o bloco de **validação** comentado (quando existir).
5. Atualize este doc se criar migration `58+`. DDL remoto: MCP `apply_migration` **e** o arquivo no git.

### Ordem obrigatória

```
01_auth_roles_access.sql
02_views_metricas.sql
03_cadastro_clientes_extensao.sql
05_cadastro_clientes_make_ids.sql    ← pular 04 (deprecada)
06_editorial.sql
07_views_fix_security_invoker.sql
08_aliases_e_null_guard.sql
09_owner_admin_guard.sql
10_editorial_media.sql
11_plano_estrategico.sql
12_plano_objetivo_scope.sql
13_access_management.sql
14_access_lifecycle_fix.sql
15_auth_invalidate_sessions.sql
16_lifecycle_invite_expired_removal.sql
… (17–27 — ver arquivos em supabase/migrations-official/)
28_platform_hub.sql
29_platform_hub_homologation.sql
30_parallel_metricas_homologation.sql
31_plano_alinhamento.sql
… (32 — ver arquivos em supabase/migrations-official/)
33_instagram_media_metrics.sql
34_instagram_profile_prefer_hub.sql
35_cliente_diretrizes.sql
36_meta_ads_prefer_hub.sql
37_meta_ads_results_conversions.sql
38–45  Conteúdos (ver arquivos)
46_meta_instagram_extra_insight_metrics.sql
47_meta_ads_prefer_hub_ignore_empty_markers.sql
48_base_metricas_hub_natural_key.sql
49_google_ads_prefer_hub.sql
50_ga4_prefer_hub.sql
51_views_security_invoker.sql
52_base_metricas_make_schema.sql
53_app_notifications.sql
54_overview_prefer_hub_and_make_rls.sql
55_overview_query_timeout.sql
56_portfolio_overview_single_pass.sql
57_overview_paid_conversions.sql
60_dashboard_prefer_hub_rpc.sql
```

### Rollback

Migrations são **aditivas** — não há rollback automático. Reverter exige migration compensatória
nova (nunca editar migration já aplicada em produção).

### Ambiente local com Supabase CLI (futuro)

Quando `supabase/config.toml` existir:

```bash
supabase db push
```

Hoje **não configurado** neste repositório.
