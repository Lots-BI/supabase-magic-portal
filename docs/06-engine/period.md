---
title: Período & Timezone
description: API de src/lib/period.ts — janelas temporais em America/Sao_Paulo.
status: living
owner: Engenharia Lots BI
last_review: 2026-06-26
---

# Período & Timezone

**Fonte única:** `src/lib/period.ts` · [ADR-0006](../02-architecture/adr/0006-timezone-america-sao-paulo.md)

---

## Constantes

| Nome     | Valor               |
| -------- | ------------------- |
| `APP_TZ` | `America/Sao_Paulo` |

---

## Funções utilitárias

| Função                  | Descrição                                 |
| ----------------------- | ----------------------------------------- |
| `brtToday(d?)`          | Dia atual em BRT como `YYYY-MM-DD`        |
| `addDaysISO(iso, n)`    | Soma dias a data ISO (sem timezone drift) |
| `diffDaysISO(from, to)` | Diferença em dias                         |

---

## Presets (`PeriodPreset`)

| Preset       | Label           | Janela                    |
| ------------ | --------------- | ------------------------- |
| `today`      | Hoje            | Hoje                      |
| `yesterday`  | Ontem           | Ontem                     |
| `last_7`     | Últimos 7 dias  | 7 dias até hoje           |
| `last_30`    | Últimos 30 dias | 30 dias                   |
| `last_90`    | Últimos 90 dias | 90 dias                   |
| `this_month` | Este mês        | 1º do mês → hoje          |
| `last_month` | Mês passado     | Mês anterior completo     |
| `custom`     | Personalizado   | `customFrom` / `customTo` |

Lista UI: `PERIOD_PRESETS` exportado do módulo.

---

## Tipo `Period`

```typescript
interface Period {
  preset: PeriodPreset;
  from: string; // YYYY-MM-DD inclusivo
  to: string;
  prevFrom: string; // janela anterior (mesmo comprimento)
  prevTo: string;
  days: number;
  label: string; // rótulo pt-BR
}
```

---

## `resolvePeriod(input: PeriodInput): Period`

Função principal — converte preset (+ opcional custom) em janela completa com comparativo.

Usado por: `PlatformDashboard`, overview dashboards, componentes com `PeriodSelector`.

---

## Regra crítica

```typescript
// ❌ NUNCA para "hoje"
new Date().toISOString().slice(0, 10);

// ✅ SEMPRE
brtToday();
```

Entre 21h e 23h59 BRT, UTC já é o dia seguinte — dashboards mostrariam data errada.

---

## Dívida conhecida

`admin/relatorios.tsx` usa `periodRange` de `metrics.ts` com `PeriodDays` (7/30/90) —
paralelo parcial ao sistema `period.ts`. Unificar no roadmap (D8).

---

## Referências

- [Glossário](../00-company/glossary.md)
- [Dashboards](../06-dashboards/dashboards.md)
