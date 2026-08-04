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
| Connection ID | `bb56230f-6a9d-4a32-a3f1-621b8f6c1d79` |
| Label | Meta - Agência Lots |
| Ad Account primário | `act_775882631991215` (Leandro MAJR) |
| Dono ops | _nome_ |
| Cadência sync | 1× / 2× por dia |
| Limiar divergência provisório | _ex.: ±5% spend / ±10% clicks_ |
| Aceite write Hub no Supabase atual | [x] sim (Make intacto; `active_source=make`) |
| Data início dual-run | 2026-08-04 |
| Data fim prevista | 2026-08-18 (aprox. 2 semanas) |
| Estágio migração | `dual_run` (atualizado 2026-08-04) |

### Snapshot verificação (2026-08-04)

| Check | Resultado |
|-------|-----------|
| Status / health | `active` / `healthy` (score 85) |
| Provider | `official_api` |
| OAuth token no vault | `meta:oauth:token` presente |
| Identidades | 4 (business, **ad_account primary**, page, instagram @agencia.lots) |
| Sync runs | 2× `success`, 4 rows cada |
| `base_metricas_hub` | Campanha `[RMKT] Lots BI - WhatsApp` · 2026-08-04 · impressions/reach/clicks/spend |
| Dashboards cliente | Ainda Make (`ph_metricas_source.active_source = make`) |
| Diagnóstico UI | `warning` (não bloqueante; acompanhar no dual-run) |

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

**Go** (agendar Marco 2 — cutover + scheduler):

- Todos os KPIs no alvo
- Identity correta (Ad Account / currency / tz)
- Ops consegue operar pelo [runbook](./marco1-piloto-runbook.md)

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
