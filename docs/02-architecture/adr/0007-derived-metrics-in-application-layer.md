---
title: "ADR-0007: Métricas derivadas na camada de aplicação"
status: proposed
date: 2026-06-26
deciders: Engenharia Lots BI
---

# ADR-0007: Métricas derivadas na camada de aplicação

## Contexto

Princípio arquitetural do Lots BI: o banco armazena **apenas métricas oficiais** das APIs.
KPIs derivados (CTR, CPC, CPA, CPM, engagement rate, frequency) devem ser calculados em
**um único módulo** compartilhado.

**Estado atual (fato):** views SQL em `supabase/migrations-official/` calculam CTR, CPM e
`engagement_rate` diretamente no Postgres. O módulo `src/lib/platforms/formulas.ts` também
calcula esses KPIs. Isso cria risco de divergência.

## Decisão (alvo)

1. **Proibir** persistência e exposição de métricas derivadas nas views SQL.
2. Views expõem somente agregações de métricas oficiais (SUM, COUNT por dia).
3. Toda métrica derivada é calculada em `formulas.ts` (evoluir para pacote `@lots/metrics`).
4. Componentes React **nunca** implementam fórmulas — apenas consomem resultados do motor.

## Consequências

### Positivas

- Fonte única de verdade para fórmulas.
- Mudança de definição de KPI sem migration SQL.
- Testes unitários centralizados.

### Negativas / custo de migração

- Refatorar views existentes (breaking change para queries diretas).
- Período de paridade: validar SQL vs TS antes de remover colunas derivadas.
- Possível impacto em performance (cálculo no app vs SQL) — mitigar com agregação eficiente.

## Estado de implementação

| Item                       | Status          |
| -------------------------- | --------------- |
| `formulas.ts` centralizado | ✅ Parcialmente |
| Views sem derivadas        | ❌ Pendente     |
| Pacote compartilhado       | ❌ Não existe   |
| Testes de paridade         | ❌ Não existe   |

## Referências

- [Modelo de métricas](../../04-database/metrics-model.md)
- Migrations: `02_views_metricas.sql`, `07_views_fix_security_invoker.sql`, `08_aliases_e_null_guard.sql`
