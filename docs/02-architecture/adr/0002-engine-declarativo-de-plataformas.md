---
title: ADR-0002 — Engine declarativo de plataformas
status: Aceito
date: 2026-06-26
---

# ADR-0002 — Engine declarativo de plataformas

## Contexto

O Lots BI exibe dashboards para várias plataformas de marketing (Meta Ads, Google Ads, GA4,
Instagram…), cada uma com métricas, KPIs e gráficos próprios. Implementar uma tela por
plataforma levaria a duplicação massiva e a divergência de cálculos entre telas.

## Decisão

Descrever cada plataforma como **dados** — um objeto `PlatformDef`
(`src/lib/platforms/types.ts`) contendo métricas, estratégias de agregação, KPIs derivados,
gráficos e perguntas de negócio. Um único componente genérico
(`src/components/lots/PlatformDashboard.tsx`) renderiza qualquer plataforma a partir do
`PlatformDef`. Todo cálculo passa por um engine puro (`engine.ts`, `aggregations.ts`,
`formulas.ts`).

Adicionar uma plataforma = criar um `PlatformDef` + registrá-lo em
`src/lib/platforms/registry.ts`. Nenhum componente React precisa ser tocado.

## Alternativas consideradas

- **Uma página/componentes por plataforma:** mais liberdade visual, mas duplicação e
  inconsistência de KPI.
- **Cálculo no SQL para tudo:** menos flexível para KPIs compostos e comparativos; mais
  difícil de testar isoladamente.

## Consequências

### Positivas

- **Fonte única de verdade** para fórmulas (mesmo CTR no admin e no cliente).
- Extensibilidade real e baixo custo para novas plataformas.
- Engine puro = altamente testável.

### Negativas / dívidas

- Customização visual muito específica de uma plataforma exige estender o `PlatformDef`/engine.
- `metrics.ts` (overview consolidado) e `platforms/engine.ts` ainda são dois caminhos de
  agregação — convergir é item de roadmap.
- Hoje o `registry.ts` cobre `google_ads`, `meta_ads`, `instagram`, `ga4`. Google Business e
  TikTok ainda não têm `PlatformDef`.
