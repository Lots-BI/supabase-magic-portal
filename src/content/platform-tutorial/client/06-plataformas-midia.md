---
title: Plataformas de mídia
description: Google Ads, Meta Ads, Instagram e GA4 — KPIs, gráficos e campanhas.
---

# Plataformas de mídia (`/cliente/{slug}/{plataforma}`)

Cada plataforma de anúncios ou analytics tem uma **tela dedicada** com KPIs, gráficos e tabelas. A estrutura é parecida — aprenda uma vez, repita nas outras.

Chegue por **Dashboards** no menu e toque no card da plataforma.

## Plataformas disponíveis

| Rota típica      | Plataforma                        |
| ---------------- | --------------------------------- |
| `.../google-ads` | Google Ads                        |
| `.../meta-ads`   | Meta Ads (Facebook/Instagram ads) |
| `.../instagram`  | Orgânico Instagram (visão diária)   |
| `.../publicacoes`| Publicações — métricas por post     |
| `.../ga4`        | Google Analytics 4 (site)         |

Se uma aba não aparece, a agência ainda não conectou ou não há dados no período. Para o
Instagram, você mesmo pode conectar sua conta em **Conexões** — veja o capítulo dedicado.

## Anatomia de todo dashboard de plataforma

### 1. Hero KPIs

2–4 números grandes — investimento, cliques, conversões, CTR (varia por plataforma).

### 2. Gráficos

Evolução diária, barras por campanha, etc. Passe o mouse para ver valor exato do dia.

### 3. Comparativo período atual × anterior

Tabela com variação % — ideal para ver se a última semana piorou um KPI específico.

### 4. Ranking de campanhas

Quando disponível, lista campanhas ordenadas por gasto ou conversões — identifique campeãs e freiras.

### 5. Tabela diária

Detalhe dia a dia para exportar mentalmente ou pedir planilha à agência.

### 6. Insights

Frases sobre variações > limiar — “CTR subiu 15%”.

## Google Ads — o que olhar

| KPI          | Bom sinal         | Conversar com agência se…    |
| ------------ | ----------------- | ---------------------------- |
| Investimento | Estável vs plano  | Estourou budget sem aviso    |
| Conversões   | Subindo           | Caiu 2 semanas seguidas      |
| CPA          | Caindo            | Subiu muito com mesmo spend  |
| CTR          | Saudável no setor | Muito baixo (< 1% em search) |

**Passo a passo:** período 30d → hero → ranking campanhas → anote campanha com pior CPA.

## Meta Ads — o que olhar

| KPI                  | Observação                                    |
| -------------------- | --------------------------------------------- |
| Investimento         | Inclui Facebook + Instagram ads               |
| Alcance / impressões | Frequência alta = possível fadiga de criativo |
| Conversões           | Verifique tipo (lead, purchase, mensagem)     |
| CPC / CPM            | Subida pode indicar leilão mais caro          |

**Passo a passo:** compare donut de posicionamento (se houver) → identifique criativo vencedor no ranking.

## Instagram (orgânico)

Foco em **alcance, engajamento, interações** — não confunda com Meta Ads.

- Engagement rate alto = conteúdo ressoando
- Alcance baixo com bom engajamento = audiência fiel mas pequena
- Botão **Puxar métricas** (ao lado do período) busca na Meta qualquer dia sem dados dentro
  do histórico disponível (~90 dias) — use quantas vezes precisar até completar o período.

Para **cada publicação** (post a post, com miniatura), use **Publicações** no menu da marca — capítulo dedicado neste tutorial.

## GA4 — site

| KPI               | Significado                             |
| ----------------- | --------------------------------------- |
| Sessões           | Visitas ao site                         |
| Usuários          | Pessoas únicas                          |
| Conversões        | Metas configuradas (formulário, compra) |
| Taxa de conversão | % de sessões que converteram            |

**Passo a passo:** período 30d → sessões vs conversões → taxa caiu? pode ser tráfego frio ou página lenta.

## Fórmulas que aparecem (resumo)

| Sigla | Significado rápido       |
| ----- | ------------------------ |
| CTR   | % de quem viu e clicou   |
| CPC   | Custo por clique         |
| CPA   | Custo por conversão      |
| CPM   | Custo por mil impressões |

Use o ℹ ao lado de cada métrica para definição oficial.

## Próximo capítulo

**Conta e segurança** — login, senha e boas práticas.
