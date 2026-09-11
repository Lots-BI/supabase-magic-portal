---
title: AGENT-PLAN — Pendências Lots BI
status: active
owner: agent (esta sessão e as próximas)
created: 2026-09-10
resume: WS-0
branch: feat/hub-ingest-plan
---

# AGENT-PLAN — Pendências Lots BI

Documento **só para o agente**. Humano não precisa seguir isto. Próxima sessão: ler este arquivo inteiro, achar o primeiro `- [ ]` do `resume`, executar **um** workstream (ou um passo se o WS for grande), marcar checkboxes, atualizar `resume` no frontmatter.

Não implementar nada além do WS atual. Não pular STOP GATE.

---

## Como usar

1. Abrir este arquivo. `resume:` diz o WS corrente.
2. Relê **Invariantes** (abaixo) antes de editar.
3. Executar só o WS apontado. Se bloquear, parar e escrever o bloqueio neste arquivo (secção Diário).
4. Ao terminar um WS: marcar sumário + passos, setar `resume:` para o próximo, `vitest` do recorte, dizer ao humano o que mudou e o que **não** foi commitado.
5. Commit/PR **somente se o humano pedir**.
6. PowerShell: encadear com `;`, nunca `&&`.
7. Browser: se mudar UI, verificar no browser; se não houver tools, dizer o que não deu para clicar.

Caminhos abaixo são relativos a `supabase-magic-portal/` salvo menção a `d:\lots-portal`.

---

## Invariantes (nunca violar)

- Ciclo de conteúdo (`roteiro` → … → `agendado` / `publicado`) **não muda**.
- Sem force-push, sem `--no-verify`, sem alterar git config.
- Sem commit de `.env` / secrets.
- Branch Lovable: sem force-push. Features só no repo.
- Make **não se desliga** antes do WS-6 (paridade medida).
- `base_metricas_make` é read-only para o Hub. Writer só `base_metricas_hub`.
- Timezone de janela: `America/Sao_Paulo`; fim de coleta de ads/perfil = **ontem**, não hoje.
- Views analíticas: colunas novas **só no fim** (`CREATE OR REPLACE`).
- Prefer_hub: marcador de dia vazio (campanha `''` + results/conversions 0) **não** pode esconder Make (migration 47). Não reverter isso.
- Supabase project: `ywvhoctcmibjitvwkkhb`. DDL via MCP `apply_migration` **e** arquivo em `supabase/migrations-official/`.

---

## SUMÁRIO — todas as pendências

Marcar `- [x]` só quando o critério de pronto do WS correspondente estiver cumprido.

### A. Entrega desta sessão (código já escrito, ainda não é produto)

- [ ] **P01** Diff local das métricas Meta/IG (coleta extra, dashboards, Publicações, testes) commitado **quando o humano pedir** e em `main`/PR.
- [ ] **P02** Migrations `46_meta_instagram_extra_insight_metrics` e `47_meta_ads_prefer_hub_ignore_empty_markers` no git (já aplicadas no remoto).
- [ ] **P03** Deploy (Lovable/pipeline) + humano clica **Puxar métricas** em Meta e Instagram. Sem isso o banco continua no contrato antigo.

### B. Ingestão Hub — o buraco da plataforma

- [ ] **P04** Writer Hub deixa de ser insert-only: **replace-by-day** (apaga o dia+cliente+plataforma no Hub e reinsere o envelope). Dias passam a atualizar spend/cliques, não só chaves novas.
- [ ] **P05** Unique/índice natural de `base_metricas_hub` inspecionado e alinhado ao writer (hoje o adapter assume unique que **não está** em `migrations-official/30`).
- [ ] **P06** Cron diário Meta Ads campanhas (mesmo padrão de `instagram-media-sync`: GH Action + `/api/cron/...` + `CRON_SECRET`).
- [ ] **P07** Cron diário Instagram **perfil** (account insights). Media já tem cron; perfil não.
- [ ] **P08** Confirmar secrets `APP_URL` + `CRON_SECRET` no GitHub e no runtime; cron de media de fato roda em `main`.
- [ ] **P09** `syncAll*` para Meta campanhas e IG perfil (loop `ph_connections` active), reusando o padrão de `syncAllInstagramMediaConnections`.
- [ ] **P10** Superfície de saúde: última sync, erro, dias preenchidos por conexão — admin Hub já tem `manualScheduler.run`; expor falhas de cron (timeline / overview), não um produto novo.

### C. Exatidão que ainda diverge do Gerenciador (não é “mais card”)

- [ ] **P11** Opcional: Insights Meta com `action_attribution_windows` alinhado à conta (hoje inline_link_clicks é 1d_click fixo). Só depois de P04+P06, senão recoleta não grava.
- [ ] **P12** Alcance / cliques únicos no **período** continuam MAX/pico (coleta dia a dia). Não inventar unique de 30 dias. Copy da UI já avisa; revisar se algum card ainda mente.
- [ ] **P13** Views de perfil Instagram: só entram em dia reconsultado (refresh 14d). Não padar 0. Backfill histórico só se produto pedir (não no caminho crítico).

### D. Google Ads e GA4 — Make parado em 2026-08-17

- [ ] **P14** Google Ads: OAuth/conexão official_api usável em produção (provider já existe).
- [ ] **P15** Google Ads: `prefer_hub` + botão Puxar + cron + replace-by-day (receita Meta).
- [ ] **P16** Spend Google: manter regra micros (`toBaseMetricasStorageValue`) na view/dashboard.
- [ ] **P17** GA4: idem P14–P15 (provider existe; Hub vazio).
- [ ] **P18** Dashboards Google/GA4 passam a ler Hub quando houver dia; Make só fallback.

### E. Saída do Make (depois de paridade)

- [ ] **P19** Critério escrito: N dias Hub = Make ± tolerância (spend, clicks, impressions) por cliente.
- [ ] **P20** Relatório de paridade (SQL + dual-run já existe no Hub) rodado para Meta, IG, Google, GA4.
- [ ] **P21** Desligar cenário Make **por plataforma**, não big-bang. Documentar em `docs/07-integrations/current-pipeline-make.md`.

### F. Plugins Hub sem produto

- [ ] **P22** TikTok: completar dashboard+coleta+cron **ou** esconder official_api no wizard até ter dono.
- [ ] **P23** YouTube: idem.
- [ ] **P24** Google Business: idem.
- [ ] **P25** Decisão explícita no Diário deste arquivo antes de escrever código.

### G. Dívida estrutural (não começar antes do WS-6)

- [ ] **P26** Cliente por `cadastro_clientes.id` em métricas (ADR-0004). Alto risco, migração longa.
- [ ] **P27** Versionar schema `base_metricas_make` nas migrations.
- [ ] **P28** `current_user_clientes()` sem `DISTINCT` cego.
- [ ] **P29** Views `SECURITY DEFINER` (ADR-0003) — já há `security_invoker` em 46/47; auditar o resto.
- [ ] **P30** `supabase gen types` e client tipado.
- [ ] **P31** Tirar CTR/engagement_rate das views (ADR-0007) — engine TS já calcula; SQL duplica.

### H. Infra e OS (fila atrás)

- [ ] **P32** Deploy Cloudflare (`deploy.yml`) validado N vezes; só então desconectar Lovable (ADR-0012).
- [ ] **P33** Migrations no CI (não só MCP manual).
- [ ] **P34** Alerta se `max(data)` Hub atrasar > 2 dias úteis (query simples + admin).
- [ ] **P35** Notificações de aprovação server-side (hoje localStorage).
- [ ] **P36** Métricas pós-publicação vs planejado (liga Conteúdos ↔ Publicações).
- [ ] **P37** `MetaInstagramPublisher.schedule` ainda stub — publicação agendada real.
- [ ] **P38** Auth: MFA, SSO, reenvio convite — **fora** até o BI acordar sozinho.

---

## Ordem de execução

```
WS-0 ship métricas atuais
  → WS-1 replace-by-day writer
    → WS-2 cron Meta + IG perfil
      → WS-3 saúde de sync (mínimo)
        → WS-4 Google Ads no mesmo molde
          → WS-5 GA4 no mesmo molde
            → WS-6 paridade e desligar Make
              → WS-7 P11 atribuição (opcional)
                → WS-8 P22–P25 plugins órfãos (decisão primeiro)
                  → WS-9 dívida P26–P31
                    → WS-10 infra/OS P32–P37
```

P38 não entra neste plano.

---

## WS-0 — Ship o que já está no working tree

**Objetivo:** o código de métricas desta conversa vira git + produção. Sem isso o resto coleta no escuro.

**Depende:** humano pedir commit/PR/deploy.

**Arquivos já mexidos (não reescrever a menos que teste quebre):**

- Coleta Meta: `src/modules/platform-hub/plugins/meta_ads/api/meta-graph-client.ts`, `meta-insights.mapper.ts`, `providers/official-meta.provider.ts`, `src/modules/meta-ads/meta-ads-campaigns-sync.server.ts`
- Coleta IG: `instagram-account-insights.mapper.ts`, `instagram-insights.mapper.ts`, `instagram-graph-client.ts`, `instagram-profile-sync.server.ts`
- UI: `src/lib/platforms/meta-ads.ts`, `instagram.ts`, `engine.ts`, `src/components/lots/PlatformDashboard.tsx`, `instagram-posts/*`
- SQL: `supabase/migrations-official/46_*.sql`, `47_*.sql`
- Testes em `__tests__` ao lado dos mappers

**Passos**

1. `git status` / `git diff` no repo certo (`supabase-magic-portal` vs monorepo). Confirmar que 46/47 estão no diff.
2. `npx vitest run src/modules/platform-hub/plugins/meta_ads src/modules/platform-hub/plugins/instagram_organic src/lib/platforms`
3. Se o humano pedir commit: mensagem foca o *porquê* (Gerenciador vs Lots; marcadores vs Make).
4. Se pedir PR: `gh pr create` com test plan: Puxar métricas Meta + IG, conferir cliques no link, Make da Agência Lots 29/07–13/08 **não** zerou.
5. Depois do deploy: pedir ao humano um Puxar métricas. Validar SQL:

```sql
-- contrato novo Meta
SELECT cliente, metrica, min(data), max(data)
FROM base_metricas_hub
WHERE lower(plataforma)='meta ads'
  AND metrica IN ('inline_link_clicks','video_views','conversions','results')
GROUP BY 1,2;

-- Make da Agência Lots ainda visível se Hub só tem sentinela
-- (rodar logado não dá; conferir prefer_hub via dashboard ou view como service_role)
```

**STOP GATE:** não começar WS-1 se o diff de métricas nem foi commitado **e** o humano não autorizou trabalhar em paralelo no writer. Writer pode ir em paralelo **no código**; não misturar no mesmo commit se o humano quiser PR pequeno.

**Pronto quando:** P01–P03 ou humano disse para seguir no writer mesmo sem deploy.

---

## WS-1 — Replace-by-day no Hub writer

**Objetivo:** recoleta **atualiza** o dia. Sem isso cron e “refresh 3/14 dias” são no-op nas chaves antigas.

**Arquivos**

- `src/modules/platform-hub-bridges/base-metricas/supabase-base-metricas-insert.adapter.ts` (hoje: `excludeExistingMetricRows` + insert)
- `src/modules/platform-hub-bridges/base-metricas/ports/base-metricas-insert.port.ts` — estender o port (`replaceDays` ou `writeRows`) sem mentir o nome `insertRows`
- `src/modules/platform-hub-bridges/base-metricas/metric-row-natural-key.ts` + testes
- `src/modules/platform-hub-bridges/base-metricas/__tests__/*`
- `src/modules/platform-hub/metric-pipeline/__tests__/passive-production-writers.test.ts`
- Inspecionar unique real:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'base_metricas_hub';
```

Se não houver unique em `(cliente, plataforma, metrica, data, coalesce(campanha,''))`, migration `48_base_metricas_hub_natural_key.sql` **antes** do upsert. Deduplicar linhas duplicadas no SQL antes de criar o índice.

**Passos**

1. MCP `execute_sql` nos indexes + `count(*)` vs `count(distinct ...)` para achar duplicatas.
2. Se duplicata: migration de limpeza (ficar a linha mais recente por chave) + unique.
3. Implementar **replace-by-day**, não upsert cego de uma métrica:
   - Input: batch já normalizado.
   - Datas distintas no batch + `cliente` + `plataforma`.
   - `DELETE FROM base_metricas_hub WHERE cliente=… AND lower(plataforma)=… AND data IN (…)`.
   - `INSERT` das linhas do envelope.
   - Motivo: campanha que sumiu no dia não pode ficar fantasma; sentinela não convive com campanha real no mesmo dia se o Graph passou a entregar.
4. Transação: delete+insert no mesmo round (ou RPC SQL `replace_hub_metric_days(...)` se o client JS não garantir atomicidade). Preferir **uma função SQL** `security definer` só service_role — menos metade de estado.
5. Testes: memory writer + adapter mock; caso “spend 10 depois spend 12 no mesmo dia” → uma linha 12; caso campanha A some → não resta A.
6. **Não** apagar Make. **Não** apagar outras plataformas. **Não** apagar datas fora do envelope.

**Verificar:** vitest do bridge `base-metricas`. Não precisa browser.

**STOP GATE:** se unique não puder ser criado por duplicata sem regra de merge, parar e anotar no Diário. Não cronar (WS-2) em cima de insert-only.

**Pronto quando:** P04 e P05.

---

## WS-2 — Cron Meta campanhas + Instagram perfil

**Objetivo:** a plataforma acorda sozinha. Copiar o que já funciona, não inventar fila.

**Molde existente (copiar fielmente)**

- Handler: `server/routes/api/cron/instagram-media-sync.get.ts` (`assertCronAuth`, Bearer `CRON_SECRET`)
- Loop: `syncAllInstagramMediaConnections` em `src/modules/instagram-posts/instagram-media-sync.server.ts`
- Workflow: `.github/workflows/instagram-media-sync-cron.yml` (02:58 UTC; secrets `APP_URL`, `CRON_SECRET`)
- Publish-due: `.github/workflows/conteudos-publish-due.yml` + `server/routes/api/cron/conteudos-publish-due.get.ts`

**Arquivos novos**

- `src/modules/meta-ads/meta-ads-campaigns-sync.server.ts` — adicionar `syncAllMetaAdsCampaignsConnections` (espelhar media: `plugin_key = meta_ads`, `status = active`, chamar `syncMetaAdsCampaignsConnection`)
- `src/modules/instagram-posts/instagram-profile-sync.server.ts` — `syncAllInstagramProfileConnections`
- `server/routes/api/cron/meta-ads-campaigns-sync.get.ts`
- `server/routes/api/cron/instagram-profile-sync.get.ts`
- `.github/workflows/meta-ads-campaigns-sync-cron.yml`
- `.github/workflows/instagram-profile-sync-cron.yml`

**Horário:** depois do media (ex. 03:10 e 03:25 UTC) para não bater rate limit da Graph na mesma janela. Timeout 15–20 min. `concurrency` por workflow, `cancel-in-progress: false`.

**Passos**

1. Extrair `assertCronAuth` para um helper compartilhado se os dois handlers duplicarem 10 linhas — só se for copy-paste óbvio (`server/lib/cron-auth.ts` ou junto dos routes).
2. `syncAll*` **sequencial** (já é o padrão). Um token 401 não aborta o resto; soma `failed`.
3. Timeout: Meta 89 dias = poucas chamadas Insights; IG perfil 14 refresh = até 14 calls/conexão. Se estourar, baixar `INSTAGRAM_PROFILE_REFRESH_DAYS` no cron (não no botão manual) — constante separada `*_CRON_REFRESH_DAYS` se preciso.
4. Workflows `if: workflow_dispatch || main`.
5. Confirmar secrets no GitHub (P08). Se faltarem, o passo é **pedir ao humano** os secrets; não inventar.
6. `workflow_dispatch` uma vez após merge; ler JSON `{ ok, succeeded, failed }`.
7. SQL: `max(data)` Hub Meta/IG = ontem BRT.

**STOP GATE:** WS-1 merged (ou no mesmo PR se o humano quiser um PR só de “ingest confiável”). Sem replace-by-day o cron só insere buracos.

**Pronto quando:** P06, P07, P08, P09.

---

## WS-3 — Saúde mínima de sync

**Objetivo:** o agente e o admin veem se a noite falhou, sem produto novo.

**Já existe:** `hub-admin.server.ts` `manualScheduler.run`; `ph_connections` last_sync / metrics_count; timeline Hub.

**Passos**

1. Garantir que `syncMetaAdsCampaignsConnection` / profile atualizam last_sync **mesmo quando Graph veio vazio mas gravou sentinelas** (hoje `metrics_count: 0` mentiu sucesso). Gravar `daysFilled` no metadata da conexão.
2. Overview Hub: uma linha “última cron Meta/IG” — se for barato, ler `max(last_sync)` por plugin. Não desenhar Datadog.
3. Toast/admin: cron falhou N conexões → timeline event já usado no Hub.

**Não fazer:** dashboard executivo de ingestão, Slack, PagerDuty.

**Pronto quando:** P10. P34 (alerta 2 dias) pode ser um SQL no overview: se `max(data) < ontem-1` mostrar aviso. Se couber em <30 min, fazer aqui; senão deixar WS-10.

---

## WS-4 — Google Ads no molde Meta

**Objetivo:** Google Ads deixa de estar congelado em 2026-08-17.

**Já existe:** `src/modules/platform-hub/plugins/google_ads/providers/official-google-ads.provider.ts`, mapper, OAuth keys, `googleAdsDef` + `vw_google_ads_diario` (Make).

**Não existe:** `prefer_hub`, sync server, botão Puxar, cron.

**Passos**

1. Conexões: listar `ph_connections` `plugin_key=google_ads`. Se zero official_api em prod, o trabalho é **wizard OAuth + developer token** (`GOOGLE_ADS_DEVELOPER_TOKEN` no server). Ler `docs/07-integrations/` e o provider. Não fingir coleta sem token.
2. Copiar receita:
   - `src/modules/google-ads/google-ads-campaigns-sync.server.ts` (gap finder + lookback; cap por run)
   - Botão em `PlatformDashboardPage.tsx` como Meta (hoje só Meta e IG têm)
   - Migration `vw_google_ads_normalizada_prefer_hub` + recriar `vw_google_ads_diario` **append-only** se precisar de colunas
3. Spend: micros no Hub se o mapper já converte; a view Make divide 1e6. **Uma** convenção. Teste explícito.
4. Replace-by-day já vale (WS-1) para qualquer plataforma Hub.
5. Cron `google-ads-campaigns-sync` no mesmo molde.
6. Testes mapper + sync gap (puro) + 1 official provider test existente.

**STOP GATE:** sem developer token / OAuth de cliente real, parar após wizard e documentar bloqueio. Não gravar zeros em cima do Make (prefer_hub + sentinelas: reaplicar filtro de campanha vazia se Google também marcar dias).

**Pronto quando:** P14–P16, P18 (Google).

---

## WS-5 — GA4 no molde Instagram perfil

**Objetivo:** GA4 deixa de estar congelado em 2026-08-17.

**Já existe:** `plugins/ga4/providers/official-ga4.provider.ts`, `ga4Def`, `vw_ga4_diario`.

**Passos:** iguais ao WS-4, sem dimensão campanha (conta/dia como IG). Gap finder de datas. Prefer_hub por `data+cliente`. Property ID na identity.

**Pronto quando:** P17, P18 (GA4).

---

## WS-6 — Paridade e desligar Make

**Objetivo:** Make sai **plataforma a plataforma** com prova, não com fé.

**Passos**

1. SQL de paridade por cliente/dia (Hub vs Make) para spend, impressions, clicks, reach. Tolerância: spend 1%; counts 0 se a API divergir de propósito (results Hub vs Make antigo).
2. Rodar 14 dias sobrepostos. Colar resultado no Diário.
3. Critério: 14/14 dias com spend dentro da tolerância **ou** Make sem linha e Hub com entrega real.
4. Só então: desligar cenário Make daquela plataforma; deixar `prefer_hub` (Make vira histórico).
5. Atualizar `docs/07-integrations/current-pipeline-make.md` e changelog. Não reescrever ADRs inteiros.

Ordem de desligar: **Instagram perfil → Meta Ads → Google Ads → GA4** (IG/Meta já têm Hub vivo; Google/GA4 só depois WS-4/5).

**STOP GATE:** nenhum desligamento se paridade falhar. Não apagar `base_metricas_make`.

**Pronto quando:** P19–P21 para as quatro.

---

## WS-7 — Atribuição Meta (opcional)

**Só se** depois do cron o Gerenciador ainda divergir em resultados/conversões (não em impressões).

**Passos:** ler Insights `action_attribution_windows` da conta; passar no `fetchCampaignInsights` se a API aceitar; teste de regressão no graph-client (retry 400). Recoleta só funciona com WS-1.

**Pronto quando:** P11 feito ou marcado “não necessário” no Diário com evidência (impressões batem, só resultado não — aí é janela; se impressões não batem, é conta/timezone, não este WS).

---

## WS-8 — Plugins órfãos

Antes de código: **P25** no Diário: completar TikTok/YouTube/GBP ou esconder `official_api` no `ConnectionWizardView` / catálogo.

Default recomendado: **esconder** no wizard até ter cliente usando. Completar só com demanda. Não abrir frente de OAuth TikTok no mesmo sprint que GA4.

**Pronto quando:** P22–P25 decididos; código só se a decisão for “esconder” (diff pequeno) ou “completar um”.

---

## WS-9 — Dívida estrutural

Ordem interna se o humano pedir esta fase:

1. P30 types (ganho imediato, baixo risco)
2. P29 auditar security_invoker nas views restantes
3. P31 parar de ler `engagement_rate` / `ctr` da view no engine (já recalcula) — drop de coluna **não** (Postgres view replace)
4. P28 current_user_clientes
5. P27 schema make versionado
6. P26 cliente_id — projeto próprio, ADR, dual-write, **não** misturar com coletor

---

## WS-10 — Infra / OS

1. P32: um deploy `workflow_dispatch` Cloudflare com `confirm=deploy` em paralelo ao Lovable; comparar. N=3 estáveis antes de desconectar Lovable.
2. P33: job CI que falha se `migrations-official` não bater com `list_migrations` MCP (ou supabase link). Não aplicar migration cega no CI contra prod.
3. P34 se não entrou no WS-3.
4. P35–P37: Conteúdos; **não** misturar com métricas. P37 (schedule stub) é o próximo do OS se publicação agendada for a dor, não o BI.

---

## Verificação rápida por WS (comandos)

```text
WS-0/1/4/5: npx vitest run src/modules/platform-hub src/lib/platforms src/modules/meta-ads src/modules/instagram-posts src/modules/platform-hub-bridges/base-metricas
PowerShell: cd d:\lots-portal\supabase-magic-portal ; npx vitest run <paths>
DDL: MCP apply_migration + arquivo 48+
Cron: gh workflow run <file> ; curl local só se CRON_SECRET no .env
SQL saúde: max(data) hub vs ontem BRT por plataforma
```

---

## Diário (o agente escreve aqui)

### 2026-09-10 — plano criado

- Estado banco: Hub Meta/IG até 2026-09-09; Make Google/GA4 até 2026-09-17→ **2026-08-17**; Make Meta até 09-03.
- Writer Hub: insert + skip existing. Unique `uq_base_metricas_hub_natural_key` citado no TS, **ausente** nas migrations-official.
- Cron vivo: IG media + conteudos-publish-due. Falta métricas de conta/ads.
- Migrations 46/47 aplicadas no remoto; código local desta sessão provavelmente uncommitted.
- `resume: WS-0`

---
