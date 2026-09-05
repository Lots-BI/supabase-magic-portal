---
title: ADR-0013 — Plano Estratégico (Centro Estratégico)
status: Aceito
date: 2026-06-29
---

# ADR-0013 — Plano Estratégico (Centro Estratégico)

## Contexto

O Lots BI precisava de um módulo que conecte planejamento estratégico, métricas de marketing,
calendário editorial e memória de decisões — sem duplicar KPIs nem parecer um CRUD genérico.

## Decisão

Implementar o **Plano Estratégico** como Centro de Inteligência com:

1. **Schema aditivo** (`11_plano_estrategico.sql`) — planos, objetivos, estratégias (com peso %),
   hipóteses, oportunidades, decisões, aprendizados, roadmap, ações, eventos e snapshots.
2. **Referências a métricas** via `plano_metric_refs` → `PLATFORM_REGISTRY` + views (`engine.ts`).
3. **Motores declarativos puros** em `src/lib/strategic-plan/` — `diagnostico.ts`, `oportunidades.ts`,
   `proximos-passos.ts`, `radar-data.ts` — interface estável para substituição futura por IA.
4. **Integração editorial** — `posts_editorial.estrategia_id` + `vw_estrategia_editorial_stats`.
5. **RLS colaborativa** — admin CRUD total; cliente edita no escopo `current_user_clientes()`.
6. **UX narrativa** — diagnóstico automático no topo, próximos passos no rodapé; CRUD em drawer.
7. **Rotas aninhadas** — layout route com `<Outlet />` + index + `$planoId` (padrão TanStack Router).

## Alternativas consideradas

- **CRUD simples por entidade:** rápido, mas não diferencia produto nem integra narrativa.
- **Duplicar métricas no Postgres:** rejeitado — viola ADR-0002 e ADR-0007.
- **IA generativa na v1:** rejeitado — apenas `ai_metadata` e interfaces prep.

## Consequências

### Positivas

- Centro único agência + cliente alinhado às métricas existentes.
- Motores testáveis (Vitest) sem React nem Supabase.
- Preparado para IA, comparação de planos e vínculo post ↔ estratégia.

### Negativas / dívidas

- Regras de diagnóstico/oportunidades são heurísticas — refinamento contínuo.
- Roadmap/aprendizados/oportunidades manuais na v1 (sem sync automático).
- `getStrategicDashboard` concentra agregação — monitorar performance com muitos KPIs.

## Visão futura (não implementada)

- IA sugerindo estratégias, tendências, objetivos, gargalos, resumos mensais e relatórios executivos.
- Substituir implementação interna dos motores mantendo interfaces `DiagnosticoInsight[]`, etc.
