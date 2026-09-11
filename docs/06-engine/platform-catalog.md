---
title: PlatformDef — Catálogo de Plataformas
description: Métricas, KPIs, gráficos e views de cada plataforma registrada.
status: living
owner: Engenharia / Dados Lots BI
last_review: 2026-06-26
---

# PlatformDef — Catálogo de Plataformas

Fonte: `src/lib/platforms/*.ts` + `registry.ts`.

---

## Google Ads

| Item     | Valor                  |
| -------- | ---------------------- |
| Key      | `google_ads`           |
| View     | `vw_google_ads_diario` |
| Arquivo  | `google-ads.ts`        |
| Campanha | `campanha`             |

### Métricas oficiais (agregação)

| Key         | Coluna      | Agg | Formato  |
| ----------- | ----------- | --- | -------- |
| spend       | spend       | sum | currency |
| impressions | impressions | sum | int      |
| clicks      | clicks      | sum | int      |

### KPIs derivados

| KPI | Fórmula                    |
| --- | -------------------------- |
| CTR | `ctr(impressions, clicks)` |
| CPC | `cpc(spend, clicks)`       |
| CPM | `cpm(spend, impressions)`  |

> Conversões **não** estão na view hoje — CPA/ConvRate quando migration adicionar coluna.

---

## Meta Ads

| Item    | Valor                |
| ------- | -------------------- |
| Key     | `meta_ads`           |
| View    | `vw_meta_ads_diario` |
| Arquivo | `meta-ads.ts`        |

### Métricas oficiais

Nomes no dashboard = Gerenciador (pt-BR). Lista completa em [meta-ads.md](../06-dashboards/platforms/meta-ads.md).

| Key | Label | Agg |
| --- | --- | --- |
| spend | Valor gasto | sum |
| results | Resultados | sum |
| messaging_conversations_started | Conversas por mensagem iniciadas | sum |
| clicks | Cliques (todos) | sum |
| reach / unique_clicks | Alcance / Cliques únicos | **max** |
| conversions | Conversões | sum |

### KPIs derivados

CTR, CTR do link, CPC, CPC do link, CPM, Frequência, **Custo por resultado**, **Custo por conversão**.

### Semântica de reach (importante)

No **dashboard Meta**, reach agrega com **MAX** (maior alcance diário no período).
Não somar dias — inflaria pessoas únicas.

No **overview** (`metrics.ts`), `instagram_reach` e métricas similares usam **MAX**.
Documentado como diferença intencional a unificar (dívida D8).

---

## Instagram

| Item    | Valor                 |
| ------- | --------------------- |
| Key     | `instagram`           |
| View    | `vw_instagram_diario` |
| Arquivo | `instagram.ts`        |

### Métricas oficiais

| Key                | Coluna             | Agg     |
| ------------------ | ------------------ | ------- |
| reach              | reach              | **max** |
| accounts_engaged   | accounts_engaged   | **max** |
| interactions       | interactions       | sum     |
| likes              | likes              | sum     |
| comments           | comments           | sum     |
| saves              | saves              | sum     |
| shares             | shares             | sum     |
| profile_links_taps | profile_links_taps | sum     |

### KPIs derivados

- Engagement rate: `interactions / reach × 100`
- Média diária de interações (card comparativo)

Estratégia MAX para reach documentada **no próprio PlatformDef** — ajustável sem tocar UI.

---

## GA4

| Item    | Valor           |
| ------- | --------------- |
| Key     | `ga4`           |
| View    | `vw_ga4_diario` |
| Arquivo | `ga4.ts`        |

### Métricas oficiais

| Key              | Coluna           | Agg |
| ---------------- | ---------------- | --- |
| active_users     | active_users     | sum |
| sessions         | sessions         | sum |
| engaged_sessions | engaged_sessions | sum |
| pageviews        | pageviews        | sum |
| event_count      | event_count      | sum |
| conversions      | conversions      | sum |

### KPIs derivados

Engagement rate (sessões), eventos/sessão, views/user, conv/sessão, conv/user

---

## Plataformas sem PlatformDef

| Plataforma      | View                        | Rota                              | Status                |
| --------------- | --------------------------- | --------------------------------- | --------------------- |
| Google Business | `vw_google_business_diario` | `/cliente/{slug}/google-business` | `PlatformPlaceholder` |
| TikTok          | —                           | `/cliente/{slug}/tiktok`          | `PlatformPlaceholder` |

### Checklist para promover a cidadão de primeira classe

- [ ] Dados estáveis no Make/coletor
- [ ] View SQL validada
- [ ] `PlatformDef` + registry
- [ ] Substituir placeholder por `PlatformDashboardPage`
- [ ] Atualizar este catálogo

---

## Gráficos por plataforma

Cada `PlatformDef.charts` declara séries `area` ou `bar`. Renderizados por
`PlatformDashboard` via componentes em `components/lots/charts/`.

---

## Referências

- [Engine overview](./overview.md)
- [Fórmulas](./formulas.md)
- [Integrações](../07-integrations/integrations.md)
