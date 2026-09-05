---
title: Estratégia de Testes
description: Estado atual, prioridades e plano de implementação de testes automatizados.
status: living
owner: Engenharia Lots BI
last_review: 2026-06-26
---

# Estratégia de Testes

---

## Estado atual

| Tipo             | Status                                           |
| ---------------- | ------------------------------------------------ |
| Unitários        | ✅ Vitest — `formulas.test.ts`, `period.test.ts` |
| Integração       | ❌                                               |
| E2E (Playwright) | ❌                                               |
| RLS / SQL        | ❌                                               |
| CI enforcement   | ✅ `npm run test` no GitHub Actions              |

Framework: **Vitest** (`vitest.config.ts`). Comandos: `npm test`, `npm run test:watch`.

---

## Testes implementados

| Arquivo                              | Cobre                                                      |
| ------------------------------------ | ---------------------------------------------------------- |
| `src/lib/platforms/formulas.test.ts` | CTR, CPC, CPM, CPA, convRate, frequency, engagementRate, … |
| `src/lib/period.test.ts`             | `resolvePeriod`, `addDaysISO`, `diffDaysISO`, `brtToday`   |

---

## Pirâmide alvo

```mermaid
flowchart TB
    E2E["E2E\n(fluxos críticos)"]
    INT["Integração\n(server functions, RLS)"]
    UNIT["Unitários\n(formulas, engine, period)"]

    UNIT --> INT --> E2E
```

---

## Prioridade 1 — Unitários (alto ROI)

Módulos **puros**, sem I/O:

| Módulo                    | Casos críticos                                    |
| ------------------------- | ------------------------------------------------- |
| `formulas.ts`             | Divisão por zero, CTR, CPC, CPM                   |
| `engine.ts`               | `aggregate` sum vs max, `pctDelta`, `dailySeries` |
| `aggregations.ts`         | Cada estratégia                                   |
| `period.ts`               | `brtToday`, presets, `prevFrom/prevTo`            |
| `integrations-catalog.ts` | `getIntegrationStatus` matrix                     |

### Setup

```bash
# Já configurado — Vitest + path alias @/
npm run test
npm run test:watch
```

~~Setup recomendado~~ (concluído em ADR-0011):

```bash
npm install -D vitest @vitest/coverage-v8
```

---

## Prioridade 2 — Integração

| Alvo             | Abordagem                       |
| ---------------- | ------------------------------- |
| Server functions | Mock Supabase client            |
| RLS policies     | Supabase local ou test project  |
| Views SQL        | Fixture data + snapshot queries |

---

## Prioridade 3 — E2E

Fluxos críticos:

1. Login → dashboard com dados
2. Admin cria cliente + integração
3. Aprovação editorial (cliente)

Ferramenta sugerida: Playwright.

---

## Definition of Done (futuro)

Quando suite existir:

- [ ] Nova fórmula → teste em `formulas.test.ts`
- [ ] Nova agregação → teste em `engine.test.ts`
- [ ] PR falha se testes quebram

---

## Cobertura mínima alvo

| Área             | Meta inicial                 |
| ---------------- | ---------------------------- |
| `formulas.ts`    | 100%                         |
| `engine.ts`      | >90%                         |
| `period.ts`      | >90%                         |
| Server functions | Casos críticos (auth, admin) |
| UI components    | Smoke E2E apenas             |

---

## Referências

- [CI/CD](../08-operations/cicd.md)
- [Fórmulas](../06-engine/formulas.md)
- [Roadmap](../11-roadmap/roadmap.md) Fase 2
