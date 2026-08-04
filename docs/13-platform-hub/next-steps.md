---
title: Platform Hub — O que falta e próximos passos
description: Backlog priorizado pós-RC1 para levar o Hub de homologação a produção com clientes.
status: living
owner: Engenharia Lots BI
tags: [platform-hub, roadmap, backlog]
difficulty: intermediate
last_review: 2026-08-04
---

# O que falta — Platform Hub RC1 → Produção

Estado em **ago/2026** após Marco 1 piloto + Marco 2 prep (scheduler CLI). Prioridade: **P0** bloqueia produção client-facing; **P1** homologação; **P2** melhoria.

---

## P0 — Bloqueadores de produção

| # | Item | Situação | Ação |
|---|------|----------|------|
| 1 | **Cutover `ph_metricas_source`** | Default `make`; CLI dry-run pronto | Dual-run Go → `npm run hub:cutover -- --to=hub --confirm=hub` ([Marco 2](./marco2-scheduler-and-cutover.md)) |
| 2 | **OAuth secrets no deploy** | `deploy.yml` sem vars Hub/OAuth | Adicionar secrets Meta/Google/TikTok + `APP_URL` + `HUB_CREDENTIAL_ENCRYPTION_KEY` |
| 3 | **Piloto real com dados live** | Piloto Meta em dual_run (ago/2026) | Completar 1–2 semanas + KPIs no checklist |
| 4 | **Scheduler automático** | CLI `hub:sync-official` + workflow manual | Ativar cron/Actions schedule no ambiente alvo |

---

## P1 — Homologação e operação

| # | Item | Situação | Ação |
|---|------|----------|------|
| 5 | Gate A live no CI | Skipped (sem credenciais) | Job manual ou secrets staging |
| 6 | Paridade Google/TikTok | Plugins existem; menos exercício que Meta | Piloto por plataforma + ajuste identity discovery |
| 7 | Alertas operacionais | Card na Central básico | Expandir: sync falho, token expirado, divergência dual-run |
| 8 | RLS `ph_*` para roles | Admin via service role | Políticas para leitura auditável sem service role no browser |
| 9 | Tutorial plataforma | `07-clientes-integracoes` sem Hub | Atualizar tutorial admin com `/admin/conexoes` |

---

## P2 — Produto e escala

| # | Item | Ação |
|---|------|------|
| 10 | LinkedIn, Pinterest | Novos plugins via `create:plugin` |
| 11 | Logs request/response | Timeline enriquecida (sem payload sensível) |
| 12 | Multi-tenant Hub isolado | Revisar RLS + connection scoping por agência |
| 13 | Desligar Make por cliente | Estágio `make_off` + checklist operacional |
| 14 | Métricas derivadas só no app | Alinhar com princípio "banco só oficial" pós-cutover |

---

## Checklist — primeiro dia no projeto

1. Ler [handoff-rc1.md](./handoff-rc1.md)
2. `npm run hub:doctor`
3. Abrir `/admin/conexoes` e `/admin/ai-workspace`
4. Ler ADRs 0020–0024
5. **Marco 1:** [runbook piloto](./marco1-piloto-runbook.md) + [checklist dual-run](./marco1-dual-run-checklist.md)
6. Escolher **um** item P0 ou P1 e abrir issue/PR

---

## Decisões pendentes (product/CTO)

- Limiar de divergência aceitável no dual-run (por métrica/plataforma)
- Ordem de cutover: Meta primeiro vs GA4 primeiro
- Onde roda o scheduler (Supabase Cron vs Cloudflare Worker)
- Data alvo para `active_source = 'hub'` em staging vs produção

---

## Não fazer sem ADR

- Alterar contratos em `contracts/`
- Mudar assinatura de ports do kernel
- Escrever direto em `base_metricas` (legado Make) pelo Hub
- Forçar `PLATFORM_HUB_WRITER_TARGET=MAKE` (bloqueado no código)
