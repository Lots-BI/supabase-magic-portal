---
title: Fórmulas Oficiais de Marketing
description: Referência completa de src/lib/platforms/formulas.ts — fonte única de KPIs derivados.
status: living
owner: Engenharia / Dados Lots BI
last_review: 2026-06-26
---

# Fórmulas Oficiais de Marketing

**Fonte única de verdade:** `src/lib/platforms/formulas.ts`

> Recebem **totais já agregados** do período. Nunca calcular sobre média de médias.

---

## Helper interno

```typescript
safeDiv(a, b) → a / b se b > 0 e valores finitos, senão 0
```

---

## Catálogo

| Função                                | Fórmula                    | Unidade   | Uso             |
| ------------------------------------- | -------------------------- | --------- | --------------- |
| `ctr(impressions, clicks)`            | clicks ÷ impressions × 100 | % (0–100) | Google, Meta    |
| `cpc(spend, clicks)`                  | spend ÷ clicks             | BRL       | Google, Meta    |
| `cpm(spend, impressions)`             | spend ÷ impressions × 1000 | BRL       | Google, Meta    |
| `cpa(spend, conversions)`             | spend ÷ conversions        | BRL       | Futuro          |
| `convRate(num, den)`                  | num ÷ den × 100            | %         | GA4, conversões |
| `frequency(impressions, reach)`       | impressions ÷ reach        | decimal   | Meta            |
| `engagementRate(interactions, reach)` | interactions ÷ reach × 100 | %         | Instagram       |
| `eventsPerSession(events, sessions)`  | events ÷ sessions          | decimal   | GA4             |
| `viewsPerUser(views, users)`          | views ÷ users              | decimal   | GA4             |
| `dailyAverage(total, days)`           | total ÷ days               | decimal   | Comparativos    |

---

## Onde cada fórmula é usada

| Fórmula        | PlatformDef  | Overview (`metrics.ts`) |
| -------------- | ------------ | ----------------------- |
| ctr            | Google, Meta | `deriveCtr`             |
| cpc            | Google, Meta | —                       |
| cpm            | Google, Meta | —                       |
| cpa            | — (futuro)   | `deriveCpa`             |
| convRate       | GA4 KPIs     | —                       |
| frequency      | Meta         | —                       |
| engagementRate | Instagram    | —                       |

---

## Regras

1. **Nunca** duplicar fórmulas em componentes React
2. **Nunca** persistir resultados no banco (arquitetura alvo — ADR-0007)
3. Views SQL que calculam CTR/CPM são **dívida** — engine é autoritativo na app
4. Novas fórmulas: adicionar aqui + teste unitário (quando suite existir)

---

## Testes recomendados

```typescript
// Casos mínimos por fórmula
ctr(1000, 50) === 5;
ctr(0, 0) === 0;
cpc(100, 0) === 0;
```

Ver [Estratégia de testes](../09-standards/testing.md).

---

## Referências

- [Engine overview](./overview.md)
- [Modelo de métricas](../04-database/metrics-model.md)
- [ADR-0007](../02-architecture/adr/0007-derived-metrics-in-application-layer.md)
