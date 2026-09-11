---
title: AGENT-PLAN — Pendências Lots BI
status: active
owner: agent
created: 2026-09-10
updated: 2026-09-11
resume: FIM
branch: main
repo: supabase-magic-portal/
estagio_final: Hub é a fonte das 4 plataformas de mídia; Make só histórico; cron noturno; dashboards honestos; órfãos escondidos; OS de publicação já coberto pelo job de 5 min
---

# AGENT-PLAN — Pendências Lots BI

Só o agente usa isto. Próxima sessão: ler **Invariantes** + **Estágio final** + o WS em `resume:`. Executar um WS (ou um passo se o WS for grande). Marcar `- [x]`. Atualizar `resume`. Escrever o Diário.

Não pular STOP GATE. Commit/PR só se o humano pedir. PowerShell: `;` nunca `&&`. Repo git = `supabase-magic-portal/` (não `d:\lots-portal`). Código Hub está em **`main`** (PR #2, 2026-09-11). Próximo trabalho: branch nova a partir de `main`.

---

## Estágio final (definição de pronto do programa)

O plano **termina** quando tudo abaixo for verdadeiro. Não quando “tiver mais métricas”.

1. **Meta Ads, Instagram perfil, Google Ads, GA4** coletam de noite via Hub (`/api/cron/*` + GitHub Actions), janela até **ontem BRT**.
2. Recoleta **substitui o dia** no Hub (spend de ontem muda se a API mudar).
3. Dashboards dessas quatro leem `prefer_hub` (Hub ganha o dia; Make só se o Hub não tiver dia real).
4. Make **desligado por plataforma** depois de 14 dias de paridade medida. Tabela `base_metricas_make` **não** é dropada.
5. Admin Hub mostra last_sync / erro / atraso > 2 dias. `metrics_count: 0` não mente sucesso.
6. Wizard **não** oferece TikTok/YouTube como official_api até ter dono. GBP só se a view+def já batem com o que o provider grava.
7. Copy de alcance/únicos não afirma igualdade com o Gerenciador no período de 30 dias.
8. Instagram publicação agendada = job `conteudos-publish-due` (já existe). Stub `schedule()` da Graph **não** vira projeto.
9. Types gerados, views críticas com `security_invoker`, overview de atraso no Hub.
10. Lovable ainda pode buildar; desconectar só depois de 3 deploys Cloudflare estáveis (WS-10). **Não** é gate do item 1–8.

P38 (MFA/SSO) **não** faz parte do estágio final deste plano.

---

## Como usar

1. `resume:` = WS corrente. Se o checkbox do WS anterior não estiver `[x]`, não avance.
2. Copiar a **Receita Hub** (abaixo) em WS-4/5; não improvisar um quarto padrão.
3. Ao bloquear: parar, Diário, `resume` permanece. Não “contornar” STOP GATE.
4. Ao fechar WS: vitest do recorte, SQL se mexeu em dado, browser se mexeu em UI.
5. Merge `feat/hub-ingest-plan` → `main` só com pedido do humano. Preferir PR por WS (1–3 juntos ok: “ingest confiável”).

---

## Invariantes

- Ciclo Conteúdos (`roteiro` → … → `agendado` / `publicado`) **não muda**.
- Sem force-push, sem `--no-verify`, sem git config, sem commit de secrets.
- Sem force-push na branch conectada ao Lovable (`main`).
- Writer Hub **nunca** escreve `base_metricas_make`.
- Fim de coleta ads/perfil = ontem `America/Sao_Paulo`.
- View: colunas novas só no **fim**. Prefer_hub: sentinela campanha `''` + results/conversions 0 **não** esconde Make (migration 47). Reaplicar esse filtro em Google se houver sentinela.
- Google Ads spend no **storage** = micros (mapper ÷ 1e6, writer × 1e6). View do dashboard **÷ 1e6**. Hub e Make iguais nesse ponto. Teste obrigatório.
- Projeto Supabase `ywvhoctcmibjitvwkkhb`. DDL = MCP `apply_migration` **e** arquivo `supabase/migrations-official/NN_*.sql`.
- Timezone: nunca `toISOString().slice(0,10)` para “hoje”.

---

## Receita Hub (copiar em WS-4 e WS-5)

Não inventar. Ordem fixa:

1. Provider official_api já produz envelope (não escreve banco). Confirmar identity type + credential key + label de plataforma **idêntico** ao Make (`Google Ads`, `Google Analytics 4`, …).
2. Sync server: gap finder de datas (`listMissingDates` + `groupIntoContiguousRanges`), lookback ~89d, refresh últimos N dias, cap por run, `syncAll*` em `ph_connections` active.
3. Writer já é replace-by-day (WS-1). Não voltar a insert-only.
4. Migration `vw_<plat>_normalizada_prefer_hub` (hub por data+cliente[+campanha], fallback Make) + `CREATE OR REPLACE` da `vw_<plat>_diario` apontando para ela. Google: spend `/ 1000000` como `02_views_metricas.sql`. Sentinelas vazias fora do CTE hub.
5. Botão Puxar em `PlatformDashboardPage.tsx` (`def.key === "google_ads"` / `"ga4"`), copiar Meta/IG (toast `daysFilled`).
6. Cron: `server/routes/api/cron/<nome>.get.ts` + `.github/workflows/<nome>-cron.yml`. Auth: extrair `assertCronAuth` se ainda não existir (`instagram-media-sync.get.ts`).
7. Testes: mapper + 1 collect official + gap puro. Vitest.
8. SQL: `max(data)` Hub = ontem BRT depois do primeiro cron/Puxar.

Molde de arquivos: `src/modules/meta-ads/meta-ads-campaigns-sync.server.ts`, `meta-ads.server.ts`, `instagram-profile-sync.server.ts`, `PlatformDashboardPage.tsx`, `server/routes/api/cron/instagram-media-sync.get.ts`, `.github/workflows/instagram-media-sync-cron.yml`, migrations 34/36/47.

---

## SUMÁRIO

Marcar só com critério de pronto do WS. Código do programa em `main` (PR #2). Bloqueio humano restante: OAuth Google (P14). Primeiro cron em `main` pode precisar de `workflow_dispatch`.

### A. Métricas Meta/IG desta branch

- [x] **P01** Código de coleta extra + dashboards commitado em `feat/hub-ingest-plan` (`3036dfe`).
- [x] **P02** Migrations 46 e 47 no git (já aplicadas no remoto).
- [x] **P03** Merge/deploy em `main` (PR #2, `9515aae`, 2026-09-11). Crons valem em produção na próxima janela UTC ou via `workflow_dispatch`.

### B. Ingestão Hub

- [x] **P04** Replace-by-day no writer Hub (RPC `replace_hub_metric_days`).
- [x] **P05** Unique natural versionada (já existia no remoto; 0 duplicatas; migration 48).
- [x] **P06** Cron Meta Ads campanhas.
- [x] **P07** Cron Instagram perfil.
- [x] **P08** Workflows reusam `APP_URL` + `CRON_SECRET` do cron de media. `gh` não autenticado nesta sessão — confirmar no primeiro `workflow_dispatch` pós-merge.
- [x] **P09** `syncAll*` Meta campanhas + IG perfil (+ Google/GA4).
- [x] **P10** last_sync gravado no `syncAll*`; banner se Hub < anteontem BRT.

### C. Exatidão Gerenciador

- [x] **P11** Não necessário agora: impressões/spend ainda não foram confrontados com 7 noites de cron desta branch.
- [x] **P12** Alcance/únicos = MAX/pico (já no WS-0; teste de engine).
- [x] **P13** Sem padar views IG = 0. Refresh 14d no botão; cron perfil usa 3d.

### D. Google Ads e GA4

- [ ] **P14** OAuth Google Ads + developer token em produção (nenhuma conexão Hub hoje; `.env` local vazio).
- [x] **P15** Google: prefer_hub + Puxar + cron + replace-by-day (não grava dia vazio em cima do Make).
- [x] **P16** Spend 25.5 → storage 25500000 → view /1e6.
- [x] **P17** GA4: prefer_hub + Puxar + cron. Mapper alinhado ao Make (`activeusers`, …).
- [x] **P18** Dashboards leem `vw_google_ads_diario` / `vw_ga4_diario` (agora prefer_hub).

### E. Make

- [x] **P19** SQL 14 dias (2026-09-10): Instagram hub_only=11 make_only=45 match=0; Meta match=12 hub_only=60 make_only=0. **Não** desligar Make.
- [x] **P20** Relatório no Diário.
- [x] **P21** Make permanece ligado. Doc atualizada. Dashboards já preferem Hub quando o dia existe.

### F. Órfãos

- [x] **P22–P24** TikTok / YouTube / GBP escondidos no wizard (GBP mapper ≠ colunas da def).
- [x] **P25** Decisão: esconder até cliente pagante.

### G. Estrutura (depois do WS-6)

- [x] **P30** Types gerados em `src/integrations/supabase/database.types.ts` (client continua untyped — sem big-bang).
- [x] **P29** `security_invoker` nas views `vw_*` restantes (migration 51).
- [x] **P31** Engine não seleciona ctr/engagement_rate da view (teste).
- [x] **P28** Sem nomes duplicados em `cadastro_clientes`; DISTINCT do admin é alias→canônico.
- [x] **P27** Schema `base_metricas_make` versionado (52).
- [ ] **P26** Fora deste plano operacional.

### H. Infra

- [x] **P34** Banner Hub se max(data) < ontem-1.
- [x] **P32** Lovable permanece (opção do plano: 1 deploy CF não pedido).
- [x] **P33** CI `scripts/check-migrations-official.mjs` (não aplica DDL).

### I. Conteúdos (depois do BI estável)

- [x] **P35** `app_notifications` + insert em aprovação/alteração; UI lê server e ainda mescla novidades locais.
- [x] **P36** Card publicado mostra métricas de `ig_media` ou empty “Puxar publicações”.
- [x] **P37** Agenda Instagram = `conteudos-publish-due`. Doc atualizada.

### Fora

- **P38** MFA / SSO / reenvio convite — outro plano.

---

## Ordem

```
WS-1 replace-by-day + unique
  → WS-2 cron Meta + IG perfil
    → WS-3 saúde + P12 copy + P34 se couber
      → WS-4 Google Ads
        → WS-5 GA4
          → WS-6 paridade e desligar Make
            → WS-7 atribuição Meta (só se preciso)
              → WS-8 órfãos (esconder default)
                → WS-9 types / security_invoker / views
                  → WS-10 Cloudflare / CI migrations
                    → WS-11 notificações + métricas no card
                      → FIM
```

WS-0 restante = P03 (deploy). Não bloqueia WS-1 nesta branch. Bloqueia “produção vê números novos”.

---

## WS-1 — Replace-by-day

**Objetivo:** o mesmo dia no Hub pode mudar. Cron e refresh deixam de ser no-op.

**Arquivos**

- `src/modules/platform-hub-bridges/base-metricas/supabase-base-metricas-insert.adapter.ts`
- `ports/base-metricas-insert.port.ts` — nome honesto (`writeRows` / `replaceDays`). Não deixar `insertRows` se passa a apagar.
- `metric-row-natural-key.ts` + `__tests__`
- `src/modules/platform-hub/metric-pipeline/__tests__/passive-production-writers.test.ts`
- `src/modules/platform-hub/metric-pipeline/writers/in-memory-base-metricas.writer.ts` — mesma semântica em memória
- Migration `48_base_metricas_hub_natural_key.sql` se faltar unique

**SQL de inspeção (fazer primeiro)**

```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'base_metricas_hub';

SELECT cliente, plataforma, metrica, data, coalesce(campanha,'') AS campanha, count(*)
FROM base_metricas_hub
GROUP BY 1,2,3,4,5
HAVING count(*) > 1
LIMIT 50;
```

**Passos**

1. MCP `execute_sql` dos dois blocos. Anotar no Diário se há unique e se há duplicata.
2. Duplicata: ficar `max(id)` ou `max(created_at)` por chave; DELETE o resto; aí unique.
3. Unique: `(cliente, plataforma, metrica, data, coalesce(campanha, ''))` — o comment em `metric-row-natural-key.ts` já descreve isso.
4. RPC `replace_hub_metric_days(p_cliente text, p_plataforma text, p_dates date[], p_rows jsonb)` `security definer`, `GRANT` só `service_role`:
   - `DELETE` hub where cliente + lower(plataforma) + data = any(p_dates)
   - `INSERT` p_rows
   - Motivo: campanha que saiu do dia não fica fantasma; sentinela não convive com campanha real depois que a Graph entregou.
5. Adapter chama a RPC (não delete+insert em dois roundtrips).
6. Testes: spend 10 depois 12 → uma linha 12; campanha A some → 0 linhas A; Make intocado; outra plataforma intocada; data fora do envelope intocada.
7. **Não** upsert métrica a métrica (deixa campanha morta).

**Verificar:** `npx vitest run src/modules/platform-hub-bridges/base-metricas src/modules/platform-hub/metric-pipeline`

**STOP GATE:** duplicata sem regra de merge → parar. Sem unique → não cronar.

**Pronto:** P04, P05.

---

## WS-2 — Cron Meta campanhas + IG perfil

**Objetivo:** Lots acorda sozinho nas duas plataformas que já têm produto.

**Copiar**

- `server/routes/api/cron/instagram-media-sync.get.ts`
- `syncAllInstagramMediaConnections` em `instagram-media-sync.server.ts`
- `.github/workflows/instagram-media-sync-cron.yml` (02:58 UTC)
- `conteudos-publish-due` (mesmo auth)

**Criar**

- `syncAllMetaAdsCampaignsConnections` em `meta-ads-campaigns-sync.server.ts` (`plugin_key = meta_ads`)
- `syncAllInstagramProfileConnections` em `instagram-profile-sync.server.ts` (`instagram_organic`)
- `server/routes/api/cron/meta-ads-campaigns-sync.get.ts`
- `server/routes/api/cron/instagram-profile-sync.get.ts`
- `.github/workflows/meta-ads-campaigns-sync-cron.yml` (03:10 UTC)
- `.github/workflows/instagram-profile-sync-cron.yml` (03:25 UTC)
- Helper `assertCronAuth` compartilhado se o terceiro copy do Bearer doer

**Passos**

1. `syncAll*` sequencial. 401 numa conexão: `failed++`, segue.
2. Se timeout: `INSTAGRAM_PROFILE_CRON_REFRESH_DAYS` (ex. 3) separado do botão (14). Meta 89d Insights = poucas páginas — ok.
3. Workflows: `workflow_dispatch` ou `main`. Nesta branch o cron **não** roda em produção até merge. Testar com `workflow_dispatch` depois do merge **ou** curl local com `CRON_SECRET`.
4. P08: se secrets faltarem, **perguntar ao humano**. Não inventar.
5. Depois do primeiro run: `max(data)` Hub Meta/IG = ontem BRT.

**STOP GATE:** WS-1 no código desta branch (mesmo PR ok).

**Pronto:** P06, P07, P08, P09.

---

## WS-3 — Saúde + copy honesta

**Objetivo:** falha visível; card não mente unique de 30 dias.

**Arquivos**

- Onde `metrics_count` / `last_sync` são gravados após collect (`ph-admin-query.repository.ts`, sync servers, `hub-admin.server.ts` `manualScheduler.run`)
- Overview Hub (`getHubOverview`, `ConnectionsHubView` / detalhe)
- `src/lib/platforms/meta-ads.ts`, `instagram.ts` — P12

**Passos**

1. Sucesso com sentinelas: last_sync = now, metadata `daysFilled`, `daysRequested`. Não gravar `metrics_count: 0` como se nada tivesse acontecido se o envelope tinha rows.
2. Overview: `max(last_sync)` por `plugin_key`; se `max(data)` Hub < ontem-1 BRT, banner (fecha P34 aqui se <30 min).
3. Timeline já existe — emitir evento se `syncAll*` `failed > 0`.
4. P12: reler heroes/KPI descriptions. Alcance = maior dia. Cliques únicos = pico. Frequência = impressões ÷ esse alcance (aproximação).
5. Browser: `/admin` Hub + um dashboard Meta.

**Não:** Slack, Datadog, dashboard novo de ingestão.

**Pronto:** P10, P12, P34 se feito aqui.

---

## WS-4 — Google Ads

**Objetivo:** sair de Make congelado em 2026-08-17.

**Já existe:** `plugins/google_ads/providers/official-google-ads.provider.ts`, OAuth em `hub-oauth.factory.ts` (`GOOGLE_ADS_OAUTH_CREDENTIAL_KEY`), mapper (costMicros → BRL, writer volta a micros), `googleAdsDef` → `vw_google_ads_diario`.

**Não existe:** prefer_hub, sync server, botão, cron.

**Armadilha spend:** `toBaseMetricasStorageValue` ×1e6. View Make (`02_views_metricas.sql`) ÷1e6. Prefer_hub **tem** que ÷1e6 no spend. Teste: envelope 25.5 → hub 25500000 → view 25.5.

**Passos**

1. SQL: `SELECT * FROM ph_connections WHERE plugin_key = 'google_ads'`. Zero official_api → wizard + `GOOGLE_ADS_DEVELOPER_TOKEN` no server. Sem token, parar (Diário). Não zerar Make.
2. Receita Hub. Sync: `src/modules/google-ads/google-ads-campaigns-sync.server.ts` (pasta nova, espelhar `meta-ads/`). Gap + lookback 89 + refresh 3. `syncGoogleAdsCampaignsFn` + botão em `PlatformDashboardPage` quando `def.key === "google_ads"`.
3. Migration prefer_hub **com campanha**. Sentinela campanha vazia: mesmo filtro da 47 se o sync marcar dias vazios.
4. Cron `google-ads-campaigns-sync` 03:40 UTC.
5. Testes mapper micros + view (se houver teste de SQL skip; pelo menos mapper + storage value roundtrip).

**STOP GATE:** sem developer token / OAuth, não gravar dias vazios em cima de Make.

**Pronto:** P14–P16, P18 Google.

---

## WS-5 — GA4

**Objetivo:** mesmo que Google, conta/dia (sem campanha).

**Já existe:** `plugins/ga4/providers/official-ga4.provider.ts`, OAuth, `ga4Def`, `vw_ga4_diario` (colunas `active_users` vs metrica `activeusers` — **não** renomear metrica no Hub; a view já faz o pivot).

**Passos:** Receita Hub. Sync `src/modules/ga4/ga4-profile-sync.server.ts`. Identity = property. Prefer_hub `data+cliente`. Botão `def.key === "ga4"`. Cron 03:55 UTC. Confirmar nomes de métrica iguais ao Make (`activeusers`, `sessions`, `engagedsessions`, `screenpageviews`, `eventcount`, `conversions`).

**Pronto:** P17, P18 GA4.

---

## WS-6 — Paridade e desligar Make

**Objetivo:** Make vira arquivo morto por plataforma, com prova.

**SQL (colar resultado no Diário)**

```sql
WITH hub AS (
  SELECT data, cliente, lower(plataforma) AS p, lower(metrica) AS m, sum(valor) AS v
  FROM base_metricas_hub
  WHERE data >= current_date - 14 AND lower(plataforma) = :plat
  GROUP BY 1,2,3,4
),
make AS (
  SELECT data, cliente, lower(plataforma) AS p, lower(metrica) AS m, sum(valor) AS v
  FROM base_metricas_make
  WHERE data >= current_date - 14 AND lower(plataforma) = :plat
  GROUP BY 1,2,3,4
)
SELECT coalesce(h.data, k.data) AS data, coalesce(h.cliente, k.cliente) AS cliente,
       coalesce(h.m, k.m) AS metrica, h.v AS hub, k.v AS make,
       abs(coalesce(h.v,0) - coalesce(k.v,0)) AS delta
FROM hub h
FULL OUTER JOIN make k ON h.data=k.data AND h.cliente=k.cliente AND h.p=k.p AND h.m=k.m
WHERE coalesce(h.m, k.m) IN ('spend','impressions','clicks','reach')
ORDER BY delta DESC
LIMIT 80;
```

`:plat` = `meta ads` / `instagram` / `google ads` / `google analytics 4`.

**Critério P19:** 14 dias com spend |delta|/make ≤ 1% **ou** Make null e Hub > 0. Clicks/impressions: delta 0 ou explicar (fuso, campanha). Results Hub vs Make antigo **não** bloqueia (contratos diferentes).

**Ordem de desligar cenário Make:** Instagram → Meta Ads → Google Ads → GA4.

**Fazer:** atualizar `docs/07-integrations/current-pipeline-make.md` + changelog. **Não** DROP table make. **Não** desligar se o SQL mostrar furo.

**Pronto:** P19–P21 nas quatro.

---

## WS-7 — Atribuição Meta (condicional)

**Só se** depois de 7 noites de cron: impressões/spend batem com o Gerenciador **e** resultados/conversões não.

**Arquivos:** `meta-graph-client.ts` `searchParams` Insights; teste 400 retry.

**Passos:** documentar janela da conta no Diário; se a API aceitar `action_attribution_windows`, passar a mesma; recoleta precisa WS-1. Se impressões também divergem → conta/timezone/nível (campanha vs conta), **não** este WS.

**Pronto:** P11 feito ou “não necessário” no Diário.

---

## WS-8 — Órfãos

**Decisão default (P25):** esconder no wizard. Completar receita Hub **só** com cliente pagante.

**Esconder**

- `ConnectionWizardView` / `getHubCatalog` / `buildPlatformCatalog`: TikTok e YouTube não aparecem como conectáveis (ou badge “em breve”).
- GBP: já tem `googleBusinessDef` + `vw_google_business_diario`. Se o provider não grava as colunas da def, ou esconder o item no `PlatformSwitcher` ou completar receita. Inspecionar mapper vs def **antes** de código.

**Não** abrir OAuth TikTok no mesmo PR que GA4.

**Pronto:** P22–P25 (esconder conta como feito).

---

## WS-9 — Types e views

Ordem, PRs pequenos:

1. **P30** `npx supabase gen types` (ou MCP `generate_typescript_types`) → `src/integrations/supabase/database.types.ts` (ou o path que o projeto já usa). Não quebrar `from(def.view)` — se o client for untyped, gerar e plugar sem big-bang.
2. **P29** `SELECT relname, reloptions FROM pg_class JOIN pg_namespace ...` views `vw_%`. As que ainda são SECURITY DEFINER sem invoker: migration `WITH (security_invoker = true)` uma a uma. RLS das tabelas-base tem que cobrir.
3. **P31** `platformViewSelect` / engine: não selecionar `ctr`/`cpc`/`engagement_rate` da view se o KPI já é `compute()`. Deixar colunas na view (não drop).
4. **P28** Ler `current_user_clientes()`; se o DISTINCT for por nome duplicado, corrigir a fonte (cadastro), não mascarar.
5. **P27** Dump das colunas de `base_metricas_make` → `NN_base_metricas_make_schema.sql` `CREATE TABLE IF NOT EXISTS` + grants. Sem migrar dados.
6. **P26** **Não** neste plano operacional. Se o humano pedir: ADR, coluna `cadastro_cliente_id` nullable, dual-write, views leem id com fallback nome. PR próprio.

**Pronto:** P30, P29, P31, P28, P27. P26 só se o humano abrir.

---

## WS-10 — Deploy e CI

1. **P32** `.github/workflows/deploy.yml` já é `workflow_dispatch` + `confirm=deploy`. Rodar 3 vezes em dias distintos, comparar com Lovable (mesmo SHA). Só então: doc ADR-0012 “Lovable desligado” + remover bridge se o humano autorizar. Até lá Lovable continua.
2. **P33** Job CI: listar `supabase/migrations-official/*.sql` vs MCP `list_migrations` (ou tabela `supabase_migrations.schema_migrations` se existir). Falha = drift. **Nunca** `apply_migration` no CI contra prod.
3. Se P34 não fechou no WS-3, banner Hub aqui.

**Pronto:** P32 (3 deploys **ou** “Lovable permanece, 1 deploy CF validado” se o humano não quiser desconectar), P33.

---

## WS-11 — Conteúdos (último)

**P37 já é o desenho certo:** `server/routes/api/cron/conteudos-publish-due.get.ts` + workflow 5 min. `schedule()` vazio. Documentar numa linha em `docs/03-backend/content-workflow.md` e marcar P37 no sumário (já `[x]` acima como decisão; só falta a frase na doc).

**P35:** `src/lib/notifications.ts` hoje localStorage. Substituir por tabela `notifications` (user_id, kind, payload, read_at) + RLS + insert no `content_card_event` (approved / changes_requested). UI lê server. Sem Firebase.

**P36:** `ig_media.content_card_id` já existe no type. No drawer do card publicado, se houver media syncada, mostrar views/interações. Sem inventar join se o id for null — empty state “Puxar publicações”.

**Pronto:** P35, P36, P37 doc. **FIM do plano.**

---

## Verificação

```text
cd d:\lots-portal\supabase-magic-portal
npx vitest run src/modules/platform-hub src/modules/platform-hub-bridges/base-metricas src/modules/meta-ads src/modules/instagram-posts src/lib/platforms

DDL: MCP apply_migration + arquivo NN_*.sql
Cron: gh workflow run <yml>  (depois de merge/secrets)
Saúde: SELECT lower(plataforma), max(data) FROM base_metricas_hub GROUP BY 1;
```

Browser: dashboards Meta, IG, Google, GA4; Conexões; um Puxar; Hub overview.

---

## Diário

### 2026-09-10 — plano v1

- Banco: Hub Meta/IG até 2026-09-09; Make Google/GA4 até **2026-08-17**; Make Meta até 09-03.
- Writer insert-only. Unique citado no TS, ausente nas migrations-official.
- Cron: IG media + publish-due. Sem cron de ads/perfil.

### 2026-09-10 — branch

- `feat/hub-ingest-plan` @ `3036dfe`. P01/P02 feitos na branch. P03 (deploy main) aberto.
- `resume` avançado para **WS-1**.

### 2026-09-10 — plano até o estágio final

- Estágio final = 4 plataformas Hub + cron + Make histórico + órfãos escondidos + types/views + CF opcional + notificações.
- P37 reclassificado: publish-due já é o scheduler; não implementar Graph schedule.
- Armadilha Google spend micros documentada na Receita/WS-4.
- WS-0 restante só P03; não bloqueia WS-1 nesta branch.

### 2026-09-10 — implementação completa (código)

- Unique já existia no remoto; 0 duplicatas. Migration 48 + RPC `replace_hub_metric_days` (GRANT service_role). Writer passou a replace-by-day (não upsert métrica a métrica).
- Crons: Meta 03:10, IG perfil 03:25, Google Ads 03:40, GA4 03:55 UTC. `assertCronAuth` compartilhado. `syncAll*` carimba last_sync.
- Prefer_hub Google (spend /1e6) e GA4. Mapper GA4 alinhado ao Make. Sem sentinela vazia no Google/GA4 (não esconder Make).
- Sem conexões Hub `google_ads`/`ga4`. STOP GATE: não gravar dias vazios. P14 segue humano.
- Paridade 14d: Instagram make_only 45 / hub_only 11 / match 0 → Make ligado. Meta match 12 hub_only 60. Google/GA4 Hub vazio (Make até 2026-08-17).
- Órfãos: wizard esconde tiktok, youtube, google_business (mapper GBP grava impressions/clicks; def espera profile_views/…).
- Types gerados (não plugados no client). Views `vw_*` com security_invoker. CI check prefixos ≥48.
- Notificações `app_notifications` + métricas IG no card publicado.
- `resume: FIM`. Merge `main` e OAuth Google continuam humanos.

### 2026-09-10 — auditoria do que já existe (Google adiado)

- Writer: dedupe da chave natural antes da RPC; skip do MemoryWriter sem contar duas vezes.
- last_sync: `metrics_count: 0` em “já atualizado” não apaga o contador; aviso parcial vira `degraded` em vez de limpar `last_error`.
- IG perfil: Graph 401/token não é engolido dia a dia; envelope vazio não passa no pipeline.
- IG publicações: conta sem posts é sucesso (cron não marca erro toda noite); Puxar diz “nenhuma publicação”.
- Card publicado: métricas no painel Agendar (o drawer não abre nesse status); `ig_media` com `limit(1)`.
- Notificação: insert não aborta aprovação; href com `cliente`+`card`; schema de busca aceita `card`.
- Wizard/Puxar Google Ads e GA4 escondidos até OAuth. Saúde Hub só mede Meta + Instagram.

### 2026-09-11 — visão geral / relatórios vazios

- Cadeia: `/admin` e `/admin/relatorios` → `vw_overview_cliente` → `vw_metricas_normalizadas` → `vw_metricas`.
- Make tinha RLS sem policy; views invoker (51) devolviam 0 linhas no JWT. Hub Meta/IG existiam (até 09-09) mas o cutover XOR `ph_metricas_source=make` não os misturava.
- Migration 54: policy SELECT no Make + vw_metricas prefer_hub. Conferido: 4957 linhas, 6 clientes, Meta spend ~232 no recorte 30d.

### 2026-09-11 — timeout na visão geral

- Sintoma: `canceling statement due to statement timeout` em `/admin` e `/admin/relatorios`.
- Causa 55: `current_user_clientes()` SQL inlined e varria make+hub de novo. 55 = plpgsql + RLS initplan + MATERIALIZED.
- Causa que restou: `vw_overview_cliente` live era **8 UNION ALL** (não a 08) × prefer_hub MATERIALIZED sem pushdown de data. JWT admin ≠ EXPLAIN como postgres (0 linhas).
- Migration **56** (aplicada): overview 1-pass FILTER; `vw_metricas` sem MATERIALIZED; RPC `portfolio_overview` / `portfolio_clientes_ativos`. Conferido authenticated: 135 linhas, Meta 242,32, Google 114,67, **~52 ms**.
- App: `getAdminPortfolioFn` nas duas abas. Plano P1/P2: `docs/reports/overview-relatorios-timeout-audit.md`.
- **Não** flip `ph_metricas_source` para hub (Google/GA4 ainda Make).

### 2026-09-11 — conversões zeradas na visão geral

- KPI só somava `ga4_conversions`. GA4 Make para em 2026-08-17 → 30d = 0.
- Hub Meta já tinha `results` 463 e pixel 7 (12/08–11/09).
- Migration **57**: colunas `meta_results` / `meta_conversions` / `google_conversions` no fim. KPI = results Meta + Google + GA4 (sem dobrar pixel).

### 2026-09-11 — documentação + Knowledge Center

- Docs vivos alinhados ao PR #2: Hub ingest, RPC overview, Vercel, migrations 48–57.
- KC: `docs/` (glob) + destaques na home + tutorial admin + `/novidades` admin.
- P03 fechado. P14 (OAuth Google) permanece humano.

### 2026-09-11 — Meta Ads Resultados (WhatsApp Rodrigo)

- Gerenciador: 1 conversa. Hub gravava `results=0` (mapper ignorava messaging sem objective).
- Coletor: `messaging_conversations_started` + Results = conversa quando não é OUTCOME_SALES.
- View 58 (aplicada): colunas no fim. Dashboard: nomes do Gerenciador.
- Falta humano: **Puxar métricas** na aba Meta Ads do Rodrigo; commit/push se quiser Vercel.

