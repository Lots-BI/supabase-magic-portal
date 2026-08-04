---
title: Platform Hub — Hub de Conexões (RC1)
description: Índice da documentação do Platform Hub — conexões, OAuth, métricas e homologação Make → Official.
status: living
owner: Engenharia Lots BI
tags: [platform-hub, conexoes, integracoes, homologacao]
difficulty: intermediate
last_review: 2026-07-09
---

# Platform Hub — Hub de Conexões

> **RC1 (jul/2026):** módulo administrativo para conectar clientes a plataformas de marketing via APIs oficiais, com vault de credenciais, diagnóstico, homologação e caminho de migração Make → Official.

Esta pasta é a **aba dedicada** do Knowledge Center ao Platform Hub. Use-a quando for trabalhar em `/admin/conexoes`, OAuth, writers de métricas ou homologação.

---

## Leitura recomendada (ordem)

| # | Documento | Tempo | Para quê |
|---|-----------|-------|----------|
| 1 | [Handoff RC1 — continuar o trabalho](./handoff-rc1.md) | 15 min | Estado atual, arquitetura, comandos, onde mexer |
| 2 | [Runbook Marco 1 — Meta piloto](./marco1-piloto-runbook.md) | 5 min | Ops: conectar, sync, troubleshooting |
| 3 | [Checklist dual-run / Go-No-Go](./marco1-dual-run-checklist.md) | 5 min | KPIs e decisão de cutover |
| 4 | [Marco 2 — Scheduler + cutover prep](./marco2-scheduler-and-cutover.md) | 5 min | Sync CLI, Actions, flip com confirmação |
| 5 | [Marco 3 — UX operação diária](./marco3-ux-diaria.md) | 3 min | Badges, atenção Conexões, Kanban mobile |
| 6 | [Guia de homologação](./homologation-guide.md) | 10 min | Piloto, dual-run, cutover de métricas |
| 7 | [O que falta e próximos passos](./next-steps.md) | 5 min | Backlog priorizado pós-RC1 |
| 8 | [Variáveis de ambiente](../ENVIRONMENT_VARIABLES.md) | 10 min | OAuth, writers, secrets |
| 9 | [Admin UI (operador)](../06-dashboards/platform-hub-admin.md) | 5 min | Rotas e fluxos sem CLI |
| 10 | [Registry ops (auto)](../06-dashboards/platform-hub-registry-ops.md) | 3 min | Plugins gerados do registry |

---

## Mapa rápido do código

```
src/modules/platform-hub/           # Kernel congelado (Runtime, Pipeline, Registry, Health)
src/modules/platform-hub-bridges/   # Writers Supabase, ph_* persistence, Gate A, homologação
src/modules/platform-hub-admin/     # Server functions admin, OAuth factory, diagnóstico
src/components/lotus/platform-hub/  # UI /admin/conexoes/*
src/routes/oauth/*/callback.tsx     # Callbacks OAuth (Meta, Google, TikTok)
supabase/migrations-official/
  28_platform_hub.sql
  29_platform_hub_homologation.sql
  30_parallel_metricas_homologation.sql
```

**Regra de ouro:** a UI e o admin **consomem** o kernel via `createAdminHubStack()` — não altere Runtime/Pipeline/Registry/Contracts sem ADR.

---

## Comandos essenciais

```bash
npm run hub:doctor          # Gate H-02 — DB, RLS, writer probe, active_source
npm run hub:sync-official -- --eligible   # sync métricas Official (Marco 2)
npm run hub:diagnose -- --connection=<id>
npm run hub:cutover         # dry-run; flip só com --to=hub --confirm=hub
npm run hub:registry        # registry-report.json
npm run generate:hub-kc-doc # atualiza platform-hub-registry-ops.md
npm run check               # gate completo (CI local)
```

---

## ADRs relacionados

- [ADR-0020](../02-architecture/adr/0020-engineering-contracts-platform-hub.md) — Engineering contracts
- [ADR-0021](../02-architecture/adr/0021-platform-hub-ports-fase-0.md) — Ports fase 0
- [ADR-0022](../02-architecture/adr/0022-hub-registry-fase-1.md) — Registry fase 1
- [ADR-0023](../02-architecture/adr/0023-modulo-estrutura-fase-2.md) — Estrutura de módulos fase 2
- [ADR-0024](../02-architecture/adr/0024-platform-hub-runtime-meta-parity.md) — Runtime Meta parity

---

## AI Workspace

O Context Pack em `/admin/ai-workspace` inclui seções **Platform Hub** e **Current Data Sources**, geradas de `registry-report.json` e docs desta pasta. Regenerar via build ou snapshot.
