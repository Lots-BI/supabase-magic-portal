---
title: Platform Hub — O que falta e próximos passos
description: Backlog priorizado pós-RC1 para levar o Hub de homologação a produção com clientes.
status: living
owner: Engenharia Lots BI
tags: [platform-hub, roadmap, backlog]
difficulty: intermediate
last_review: 2026-09-11
---

# O que falta — Platform Hub

Estado em **2026-09-11** após merge PR #2. Código Hub das 4 plataformas está em `main`.
Bloqueio humano: **OAuth Google Ads + developer token**. Não virar `ph_metricas_source` XOR.

---

## Feito (não é mais P0)

| Item | Situação |
|------|----------|
| Scheduler | Crons GitHub Actions (Meta 03:10, IG 03:25, Google 03:40, GA4 03:55 UTC) + Puxar |
| Writer | `replace_hub_metric_days` — nunca escreve Make |
| Prefer_hub | Meta, IG, Google, GA4 (Google/GA4 sem dados Hub até OAuth) |
| Overview admin | RPC `portfolio_overview` (56–57) |
| Órfãos | Wizard esconde TikTok / YouTube / GBP |
| Cutover XOR | **Não fazer** enquanto Google/GA4 forem Make |

---

## P0 — Bloqueadores restantes

| # | Item | Situação | Ação |
|---|------|----------|------|
| 1 | **OAuth Google + developer token** | Nenhuma conexão Hub Google/GA4 | P14 — humano |
| 2 | **Primeira noite de cron em `main`** | Merge foi depois das 03:10 UTC em 11/09 | `workflow_dispatch` ou esperar a próxima janela |
| 3 | **Paridade 14d → pausar Make** | Instagram make_only ainda alto | SQL no Diário; pausar **por plataforma** |

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
5. Escolher **um** item P0 ou P1 e abrir issue/PR

---

## Decisões pendentes (product/CTO)

- Limiar de divergência aceitável no dual-run (por métrica/plataforma)
- Ordem de cutover: Meta primeiro vs GA4 primeiro
- Onde roda o scheduler (Supabase Cron vs Cloudflare Worker)
- Data alvo para `active_source = 'hub'` — **adiado**; prefer_hub por dia já mistura fontes.

---

## Não fazer sem ADR

- Alterar contratos em `contracts/`
- Mudar assinatura de ports do kernel
- Escrever direto em `base_metricas` (legado Make) pelo Hub
- Forçar `PLATFORM_HUB_WRITER_TARGET=MAKE` (bloqueado no código)
