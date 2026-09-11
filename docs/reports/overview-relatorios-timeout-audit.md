---
title: Visão geral e Relatórios — auditoria de timeout e plano Hub
status: living
owner: Engenharia Lots BI
created: 2026-09-11
last_review: 2026-09-11
---

# Visão geral e Relatórios — auditoria e plano

Sintoma: `/admin` e `/admin/relatorios` falhavam com `canceling statement due to statement timeout`.

P0 (parar o timeout) **já está no banco** (migration 56). Este documento fecha a auditoria e o plano de produto das duas abas.

## Cadeia real

As duas abas **não** usam `vw_meta_ads_diario` / `vw_instagram_diario`. Liam, no browser, com JWT admin:

1. `vw_overview_cliente` (janela ~60d: período + anterior)
2. `vw_clientes_ativos` (histórico inteiro, sem filtro de data)

Cadeia SQL:

`vw_overview_cliente` → `vw_metricas_normalizadas` → `vw_metricas` → Hub ∪ leftover Make (`prefer_hub`)

Dashboards Meta/IG/Google/GA4 usam views diárias `prefer_hub` por plataforma. Por isso podiam ter número enquanto o consolidado estourava timeout.

Não usar `getSupabaseAdmin()` nessas views: `auth.uid()` nulo → `current_user_clientes()` vazio → 0 linhas.

## Por que esvaziou e depois estourou

| # | O que aconteceu | Efeito |
|---|-----------------|--------|
| 1 | `ph_metricas_source.active_source = 'make'` (XOR) | Hub ignorado no consolidado |
| 2 | `base_metricas_make` com RLS ON e **zero** policy SELECT | JWT autenticado via `security_invoker` (51) via 0 linhas |
| 3 | Migration **54**: policy Make + `vw_metricas` prefer_hub | Dados voltaram (4957 linhas; Hub até 2026-09-09; Make Google/GA4 até 2026-08-17) |
| 4 | `current_user_clientes()` `LANGUAGE sql` inlinava e **varria make+hub de novo** | Plano quadrático. **55** virou plpgsql só cadastro/`client_access` |
| 5 | **Causa do timeout que 55 não matou:** a view **live** de `vw_overview_cliente` não era a da migration 08. Era **8× `UNION ALL`**, cada um relendo `vw_metricas_normalizadas`. CTEs `MATERIALIZED` da 55 **bloqueavam pushdown de data** → 8 varreduras de Hub+Make + RLS. PostgREST corta ~8s; Postgres `statement_timeout` é 2min. |

Como `postgres`, `auth.uid()` é nulo → 0 linhas e o EXPLAIN parecia “rápido”. Isso **não** representa o JWT admin.

## P0 — o que a 56 fez

Arquivo: `supabase/migrations-official/56_portfolio_overview_single_pass.sql` (aplicada no projeto `ywvhoctcmibjitvwkkhb`).

1. `vw_overview_cliente` de volta a **um** `GROUP BY` + `SUM(...) FILTER` (forma da 08).
2. `vw_metricas` **sem** `MATERIALIZED` — filtro de `data` pode descer.
3. RPC `portfolio_overview(p_from, p_to)` `SECURITY INVOKER`: prefer_hub **uma vez**, `data` no `WHERE` **antes** do pivot. Google spend `/ 1e6`. Sentinela Meta vazia não esconde Make.
4. RPC `portfolio_clientes_ativos()`: Hub∪Make uma vez, `GROUP BY cliente`.
5. App: `getAdminPortfolioFn` (`src/modules/dashboards/admin-portfolio.server.ts`) com JWT do usuário + `assertAdmin`. `/admin` e `/admin/relatorios` passam a chamar o RPC.

### Conferido em produção (JWT admin simulado)

| Check | Resultado |
| --- | --- |
| View ainda era 8-union? | Sim, antes da 56. Depois: `FILTER`, sem `UNION ALL` |
| `SET ROLE authenticated` + JWT | RPC e view: 135 linhas (30d+prev), Meta R$ 242,32, Google R$ 114,67 — **iguais** |
| Tempo (overview RPC + ativos RPC + as duas views) | **~52 ms** (antes: timeout ~8s no API) |
| `current_user_clientes()` | 9 nomes; 5 com métrica |

Hard-refresh em `/admin` e `/admin/relatorios`. Produção antiga que ainda bate na view também deve responder: a view live já não é 8-union.

**Não** virar `ph_metricas_source` para `hub` no consolidado: esconderia Google/GA4 que ainda só existem no Make.

## Plano de produto (Hub como plataforma)

### P1 — honestidade e a mesma fonte dos dashboards

1. **Copy de cobertura.** Meta/IG no consolidado = Hub (até ontem BRT quando o cron rodou). Google Ads e GA4 no consolidado = Make até **2026-08-17** até existir OAuth/collect Hub (adiado). Não escrever “tudo em tempo real”.
2. **Last sync.** “Última sync” hoje é `max(created_at)` das métricas. Passar a `ph_connections.last_sync_at` + lag já usado no Hub admin. Chip “conta sem sync >48h” deve olhar conexão Hub quando existir; Make só como fallback histórico.
3. **Alcance Instagram.** `sumOverview` usa **MAX** (pico), não soma de dias. Label na UI: “alcance (pico no período)”. Não igualar ao Gerenciador em 30 dias.
4. **Uma fonte por plataforma.** Consolidar no RPC (ou no server fn) a partir de `vw_meta_ads_diario`, `vw_instagram_diario`, `vw_google_ads_diario`, `vw_ga4_diario` — as mesmas views `prefer_hub` dos dashboards. Um scan por plataforma, colunas já pivô. Mantém `portfolio_overview` como fachada estável.
5. **KPI alinhado ao engine.** `src/lib/metrics.ts` vs `src/lib/platforms/`: CTR/CPA/spend Google (micros) iguais aos cards Meta/IG/Google. Teste de regressão: soma Meta 30d no overview = soma do dashboard Meta da mesma janela BRT.
6. **Clientes sem métrica.** Relatórios hoje só lista quem tem linha em Hub/Make. Completar com `cadastro_clientes` ativo (já carregado na visão geral) com zeros + CTA “conectar no Hub”.
7. **Consumidores da view.** `SyncStatusBar`, `GlobalSearch`, `cliente.$cliente`, `dashboard-accounts.server.ts`, agency-os `fetch-client-performance`. Já se beneficiam da view 1-pass; no P1 migrar os que ainda fazem scan full-history para RPC/`ph_connections`.

### P2 — as abas como produto da plataforma

1. **Visão geral = pulso operacional.** Além de spend/CTR: conexões degradadas, ingest lag, cards aguardando (já existe), contas sem dado ontem. Deep-link para `/admin/conexoes` e `/admin/aprovacoes`.
2. **Relatórios = comparativo acionável.** Linha por cliente com fonte (Hub / Make leftover / sem dado), spark de 7d, delta vs período anterior, link para o dashboard da plataforma que puxa o número. Export CSV do RPC, não da view 8-union.
3. **Filtro de plataforma e cliente** no server fn (não no browser sobre 60d crus).
4. **Não** reintroduzir cutover XOR no consolidado. Make permanece leftover por `(cliente, plataforma, data)`.
5. Google/GA4 **collect** continua fora deste plano (pedido do humano). Wizard/Puxar dessas duas continuam ocultos.

### Fora de escopo

- OAuth Google Ads / GA4
- Mudar significados do ciclo Conteúdos
- Drop de `base_metricas_make`
- Admin client nas views (`auth.uid()` nulo)

## Como retomar

1. Hard-refresh `/admin` e `/admin/relatorios` (P0).
2. P1 itens 1–3 (copy + last_sync + alcance) cabem num PR de UI sem DDL.
3. P1 item 4 (RPC ler views diárias) é o próximo DDL, só se o consolidado ainda divergir dos dashboards.
4. P2 depois que Meta/IG no Hub estiverem estáveis em produção.
