---
title: Platform Hub — Guia de homologação
description: Como validar o Hub em paralelo ao Make antes do cutover de métricas para clientes.
status: living
owner: Engenharia Lots BI
tags: [platform-hub, homologacao, dual-run]
difficulty: advanced
last_review: 2026-07-09
---

# Guia de homologação — Platform Hub

Homologação = provar que o Hub coleta métricas **equivalentes** ao Make para um piloto, **sem** alterar o que os dashboards mostram até o cutover explícito.

---

## Pré-requisitos

| Item | Verificação |
|------|-------------|
| Migrations 28–30 aplicadas | `npm run hub:doctor` → Gate H-02 PASS |
| `.env` com OAuth da plataforma piloto | [ENVIRONMENT_VARIABLES.md](../ENVIRONMENT_VARIABLES.md) |
| `APP_URL` correto (redirect OAuth) | Deve bater com app Meta/Google/TikTok |
| `PLATFORM_HUB_WRITER_TARGET=HUB` | Writer grava em `base_metricas_hub` |
| `ph_metricas_source.active_source = 'make'` | **Default** — dashboards inalterados |

---

## Fases

### 1. Conexão piloto

1. `/admin/conexoes/nova` — cliente + plataforma + `official_api`
2. OAuth ou credenciais → identity picker → sync manual
3. `/admin/conexoes/:id` — **Testar** (diagnóstico 13 checks)
4. Confirmar linhas em `base_metricas_hub` (service role ou SQL)

### 2. Dual-run (UI)

- `/admin/conexoes/testing` — selecionar conexão, executar comparação
- Resultado em `ph_comparison_reports`
- Divergências: revisar envelope de ingestão, timezone, identity mapping

### 3. Rollout (UI)

- `/admin/conexoes/rollout` — visão por estágio de migração
- Avançar estágio só com relatório de paridade aceitável

### 4. Cutover de métricas (⚠️ produção)

Somente após dual-run estável:

```sql
-- Exemplo — executar com critério operacional, não automatizado no RC1
UPDATE ph_metricas_source SET active_source = 'hub' WHERE id = 1;
```

`vw_metricas` passa a ler `base_metricas_hub`. **Rollback:** voltar para `'make'`.

---

## CLI / scripts

| Comando | Uso |
|---------|-----|
| `npm run hub:doctor` | Saúde DB + writer |
| `npm run hub:sync-official -- --eligible` | Sync periódico Official → Hub ([Marco 2](./marco2-scheduler-and-cutover.md)) |
| `npm run hub:cutover` | Dry-run da fonte; flip só com `--confirm` |
| `npm run gate-a:discover` | Listar pilotos Gate A Meta |
| `npm run gate-a:parity` | Paridade CLI (staging) |
| `npm run gate-a:demo` | Teste operacional sem API live |

Runbook Gate A: `src/modules/platform-hub-bridges/gate-a-meta-staging/docs/RUNBOOK.md`

---

## Onde os dados ficam

| Dado | Tabela / view |
|------|----------------|
| Conexões | `ph_connections` |
| Credenciais (criptografadas) | `ph_credentials` |
| Identidades (ad account, etc.) | `ph_identities` |
| Syncs | `ph_sync_runs` |
| Auditoria UI | `ph_timeline_events` |
| Métricas Make (legado) | `base_metricas_make` |
| Métricas Hub | `base_metricas_hub` |
| Fonte ativa dashboards | `ph_metricas_source` → `vw_metricas` |
| Relatórios homologação | `ph_homologation_reports`, `ph_comparison_reports` |

---

## Critérios Go para piloto

- [ ] `hub:doctor` PASS no ambiente alvo
- [ ] OAuth completo para plataforma piloto
- [ ] Sync manual grava em `base_metricas_hub`
- [ ] Dual-run com divergência &lt; limiar acordado (definir por métrica)
- [ ] Diagnóstico sem falhas críticas (vault, pipeline, writer)
- [ ] Plano de rollback documentado (`active_source = 'make'`)
