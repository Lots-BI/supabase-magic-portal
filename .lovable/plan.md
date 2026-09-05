## Visão de produto

Lots BI é um SaaS de Business Intelligence para Marketing. Cada dashboard de plataforma precisa responder perguntas de negócio — não apenas listar métricas — e ser construído sobre uma arquitetura **declarativa**, na qual adicionar uma plataforma futura (LinkedIn, Pinterest, YouTube…) significa **escrever uma configuração**, não tocar componentes.

Nada de infra: Make, Supabase, views e banco permanecem como estão. Tudo acontece na camada de aplicação.

---

## 1. Núcleo declarativo (`src/lib/platforms/`)

```text
src/lib/platforms/
  types.ts          PlatformDef, MetricDef, KpiDef, AggStrategy, ChartDef
  aggregations.ts   estratégias: SUM, MAX, MIN, LAST, FIRST, AVG, CUSTOM
  formulas.ts       fórmulas oficiais reutilizáveis (CTR, CPC, CPM, CPA, ConvRate,
                    Frequency, EngagementRate, EventsPerSession, ViewsPerUser…)
  registry.ts       lista única de PlatformDef + lookup por chave
  google-ads.ts     PlatformDef
  meta-ads.ts       PlatformDef
  instagram.ts      PlatformDef (reach e accounts_engaged como estratégia configurável)
  ga4.ts            PlatformDef
```

### 1.1 `PlatformDef` — o contrato

```ts
type AggStrategy =
  | { kind: "sum" }
  | { kind: "max" }
  | { kind: "min" }
  | { kind: "last" }
  | { kind: "first" }
  | { kind: "avg" }
  | { kind: "custom"; fn: (rows: Row[], period: Period) => number };

interface MetricDef {
  key: string; // ex.: 'reach', 'impressions'
  label: string;
  column: string; // coluna na view
  format: "int" | "currency" | "percent" | "decimal";
  aggregation: AggStrategy; // ← decisão por métrica
  positiveIsGood?: boolean;
  description?: string; // explicação oficial da API
}

interface KpiDef {
  key: string;
  label: string;
  format: "percent" | "currency" | "decimal";
  positiveIsGood: boolean;
  /** Calculado a partir dos TOTAIS já agregados do período. Nunca média de médias. */
  compute: (t: Record<string, number>) => number;
  description?: string;
}

interface ChartDef {
  kind: "area" | "bar" | "donut";
  title: string;
  series: {
    metric: string;
    label: string;
    tone: "primary" | "secondary" | "success" | "warning";
  }[];
}

interface PlatformDef {
  key: "google_ads" | "meta_ads" | "instagram" | "ga4" | string;
  label: string;
  icon: LucideIcon;
  view: string; // ex.: 'vw_google_ads_diario'
  campaignField?: string; // quando houver ranking de campanhas
  metrics: MetricDef[]; // métricas brutas exibidas em cards
  kpis: KpiDef[]; // KPIs derivados
  charts: ChartDef[]; // evolução(ões)
  questions: string[]; // perguntas que o dashboard responde (header narrativo)
}
```

### 1.2 Estratégias de agregação (sem heurísticas escondidas)

Implementadas em `aggregations.ts` e aplicadas pelo motor — `Reach`, `Accounts Engaged` e qualquer outra métrica não-acumulativa **deixam de ter regra hardcoded**. Cada `MetricDef` declara explicitamente sua estratégia. A decisão de `SUM` vs `MAX` vs `LAST` é responsabilidade da `PlatformDef` e pode ser ajustada por métrica sem tocar o motor.

### 1.3 Fórmulas oficiais — uma única fonte

`formulas.ts` exporta funções puras: `ctr(impressions, clicks)`, `cpc(spend, clicks)`, `cpm(spend, impressions)`, `cpa(spend, conversions)`, `convRate(num, den)`, `frequency(impressions, reach)`, `engagementRate(interactions, reach)`, `eventsPerSession(events, sessions)`, etc.

Toda KPI declarada em qualquer `PlatformDef` usa essas funções. `src/lib/metrics.ts` (consumido pelo Dashboard Executivo e Visão Geral do Cliente) passa a importar daqui — **uma única fonte de verdade** para a plataforma inteira.

---

## 2. Motor de agregação (`src/lib/platforms/engine.ts`)

Funções puras que recebem `PlatformDef` + `rows` + `period`:

- `aggregate(def, rows, period)` → totais por métrica, aplicando a `AggStrategy` declarada.
- `deriveKpis(def, totals)` → executa cada `KpiDef.compute`.
- `dailySeries(def, rows, period)` → série diária preenchida (string-based, sem TZ drift).
- `byCampaign(def, rows)` → ranking quando `campaignField` existe.
- `deltaVsPrev(def, currRows, prevRows, period)` → totais + KPIs para comparação.

Nenhum componente React faz cálculo. Tudo passa pelo engine.

---

## 3. Componente genérico (`PlatformDashboard`)

`src/components/lots/PlatformDashboard.tsx` — recebe `def: PlatformDef`, `cliente`, `period`. Faz **uma única** query a `def.view` cobrindo `[prevFrom, to]` e renderiza, na mesma ordem para qualquer plataforma:

1. **Header narrativo** — título, descrição, período analisado, última sincronização, lista de perguntas que o dashboard responde.
2. **Cards principais** — `def.metrics` com delta vs período anterior.
3. **KPIs derivados** — `def.kpis` com delta vs período anterior.
4. **Evolução diária** — cada `ChartDef` vira um gráfico.
5. **Comparativo período atual × anterior** — bloco lado a lado.
6. **Tabela diária** — todas as métricas + KPIs por dia.
7. **Ranking de campanhas** — quando `campaignField` existe.
8. **Insights automáticos** — regras baseadas nos KPIs do `def` (variações ≥ limiar, CTR/CPA fora da faixa saudável, etc.). Sem invenção.

Adicionar LinkedIn no futuro = criar `linkedin-ads.ts` com a `PlatformDef`, registrar no `registry.ts`, criar a rota. Zero alteração no componente.

---

## 4. Período absoluto

Cada página de plataforma tem seu `PeriodPicker` próprio e passa `period` resolvido ao `PlatformDashboard`. Dentro do componente e do engine **só existem** `period.from`, `period.to`, `period.prevFrom`, `period.prevTo`. Nenhuma chamada a `new Date()`, `today()`, `now()` ou cálculo de offset.

A query Supabase de cada dashboard busca exatamente `[prevFrom, to]` em **uma chamada**, garantindo que cards, gráficos, tabela, ranking e insights consumam o **mesmo dataset** — consistência absoluta entre componentes.

---

## 5. Definições iniciais por plataforma

**Google Ads** (`view: vw_google_ads_diario`)

- Métricas brutas: impressions (SUM), clicks (SUM), spend (SUM), conversions (SUM).
- KPIs: CTR, CPC, CPM, CPA, Taxa de Conversão.
- Ranking por `campanha`.
- Perguntas: Quanto investi? Quantos cliques? Quanto custou cada clique? Qual campanha performou melhor? Como evoluiu vs período anterior?

**Meta Ads** (`view: vw_meta_ads_diario`)

- Métricas: impressions (SUM), reach (SUM diário), clicks (SUM), spend (SUM), conversions (SUM).
- KPIs: CTR, CPC, CPM, CPA, **Frequência** = impressions/reach, Taxa de Conversão, Custo por Resultado.
- Ranking por `campanha`.

**Instagram** (`view: vw_instagram_diario`)

- Estratégia **explícita por métrica**, configurável sem mexer em componente:
  - `reach`, `accounts_engaged`: estratégia inicial `MAX` — **revisável a qualquer momento** alterando apenas a `MetricDef`.
  - `total_interactions`, `likes`, `comments`, `saves`, `shares`, `profile_links_taps`: `SUM`.
- KPIs: Taxa de Engajamento, Média diária, Variação vs período anterior.

**Google Analytics 4** (`view: vw_ga4_diario`)

- Métricas: sessions, users, events, views, conversions (todas SUM).
- KPIs: Engagement Rate, Eventos por Sessão, Visualizações por Usuário, Conversão por Sessão, Conversão por Usuário.

`google_business` e `tiktok` ficam preparados — basta criar `PlatformDef` quando houver dados, sem mudar rota ou componente.

---

## 6. Páginas (apenas configuração)

Cada rota se reduz a:

```tsx
// src/routes/_authenticated/cliente.$cliente.google-ads.tsx
import { googleAdsDef } from "@/lib/platforms/google-ads";
import { PlatformDashboardPage } from "@/components/lots/PlatformDashboardPage";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/google-ads")({
  component: () => <PlatformDashboardPage def={googleAdsDef} />,
});
```

Mesma forma para `meta-ads`, `instagram`, `ga4`.

---

## 7. Convergência com telas existentes

`src/lib/metrics.ts` passa a re-exportar de `platforms/formulas.ts` (`deriveCtr`, `deriveCpa`, `deriveConvRate` viram thin wrappers). Dashboard Executivo e Visão Geral do Cliente continuam visualmente iguais, mas consumindo a mesma fonte de cálculo — eliminando definitivamente divergências.

---

## 8. Entregáveis

**Novos**

- `src/lib/platforms/{types,aggregations,formulas,engine,registry,google-ads,meta-ads,instagram,ga4}.ts`
- `src/components/lots/PlatformDashboard.tsx`
- `src/components/lots/PlatformDashboardPage.tsx` (PageHeader + PeriodPicker + Suspense)

**Editados**

- 4 rotas de plataforma (substituem `PlatformPlaceholder`)
- `src/lib/metrics.ts` (re-export das fórmulas)

**Intocados**

- Banco, views, índices, Make, RLS, autenticação, sidebar, dashboard executivo, visão geral do cliente.

---

Confirme se a direção está alinhada e eu sigo para a implementação.
