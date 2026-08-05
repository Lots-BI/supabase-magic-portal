---
title: Marco 1 — Checklist dual-run, KPIs e Go/No-Go
description: Critérios de sucesso do piloto Hub Meta, cadência, rollback e decisão de cutover.
status: living
owner: Engenharia / Ops Lots BI
tags: [platform-hub, marco-1, dual-run]
difficulty: intermediate
last_review: 2026-08-04
---

# Checklist dual-run — Marco 1

**Escopo:** 1 cliente × Meta Ads × Official API · 1–2 semanas · Make permanece fonte dos dashboards.

## Setup (preencher)

| Campo | Valor |
|-------|--------|
| Cliente piloto | Agência Lots (`cadastro_id` 15) |
| Connection ID | `37ebe453-f60f-4375-a6b7-97229f87050f` (reconectada 2026-08-04) |
| Label | Meta - Agência Lots |
| Ad Account primário | `act_775882631991215` (Leandro MAJR) |
| Dono ops | _nome_ |
| Cadência sync | 1× / 2× por dia |
| Limiar divergência provisório | _ex.: ±5% spend / ±10% clicks_ |
| Aceite write Hub no Supabase atual | [x] sim (Make intacto; `active_source=make`) |
| Data início dual-run | 2026-08-04 |
| Data fim prevista | 2026-08-18 (aprox. 2 semanas) |
| Estágio migração | `dual_run` (reconfirmado 2026-08-04 após reconnect OAuth) |

### Snapshot verificação (2026-08-04 — pós-reconnect)

| Check | Resultado |
|-------|-----------|
| Status / health | `active` / `healthy` (score 85) |
| Provider | `official_api` |
| OAuth token no vault | presente · expira ~2026-10-03 · 6 scopes |
| Identidades | 4 (business, **ad_account primary**, page, instagram @agencia.lots) |
| Sync runs | success histórico · refresh Graph bloqueado (`API access blocked`) até M0 no [checklist manual](./manual-ops-checklist.md) |
| `base_metricas_hub` | Idempotente (índice natural) · Meta Ads 2026-08-04 = 740 impressões (paridade Make) · Make intocado |
| Dashboards cliente | Ainda Make (`ph_metricas_source.active_source = make`) |
| Diagnóstico | `ok` (todos os checks) |
| `hub:doctor` | ALL PASS |

## KPIs (alvo)

| KPI | Alvo | Resultado |
|-----|------|-----------|
| Ops conecta Meta sem engenharia | Sim | |
| Sync no prazo (≥90% dos dias) | Sim | |
| Divergência dentro do limiar | Sim | |
| Token vivo (sem outage >24h sem ação) | Sim | |
| Revisão semanal confia nos números Hub | Sim | |

## Diário / semanal

- [ ] Sync conforme cadência
- [ ] Testing Center: comparação Hub vs Make (métricas acordadas)
- [ ] Check token / health da conexão
- [ ] Anotar anomalias (data, métrica, delta)

## Go / No-Go

**Go** (aplicar cutover do [Marco 2](./marco2-scheduler-and-cutover.md)):

- Todos os KPIs no alvo
- Identity correta (Ad Account / currency / tz)
- Ops consegue operar pelo [runbook](./marco1-piloto-runbook.md)
- Scheduler `hub:sync-official -- --eligible` já validado (manual ou Actions)

**No-Go:**

- Divergência acima do limiar, OAuth instável ou identity errada
- Permanecer em Make; pausar writes Hub se necessário; corrigir collector

## Rollback (se cutover já tiver sido feito no Marco 2)

```sql
UPDATE ph_metricas_source SET active_source = 'make' WHERE id = 1;
```

Confirmar dashboards voltaram a Make · comunicar ops.

## Data alvo cutover (preencher no Go)

- Staging / local: ________
- Produção: ________ (só após N dual-runs estáveis)

## Nota de rastreabilidade

Marco 1 fecha só **Campanha → caminho BI (Hub)**.  
**Campanha → Landing → Rastreamento → Lots BI** (100%) exige Marcos 2 + 7 e FK de cliente estável.
