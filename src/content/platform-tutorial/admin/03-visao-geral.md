---
title: Visão geral — dashboard executivo
description: KPIs do portfólio, gráficos, top clientes, ingestão e atalho para novo cliente.
---

# Visão geral (`/admin`)

O **Centro executivo** consolida a performance de **todos os clientes** em um único dashboard. É a foto macro da agência: investimento, alcance, sessões, conversões e saúde da ingestão.

## O que você vê ao entrar

### Cabeçalho

- **Título:** Centro executivo
- **Seletor de período:** 7, 30 ou 90 dias (canto superior direito)
- **Botão “Novo cliente”** — atalho para `/admin/clientes/novo`

### Hero KPIs (primeira fileira)

| KPI                | Significado                            | Fonte |
| ------------------ | -------------------------------------- | ----- |
| Investimento total | Soma Meta Ads + Google Ads no período  | RPC `portfolio_overview` |
| Clientes ativos    | Quantos clientes têm dados recentes    | RPC `portfolio_clientes_ativos` |
| Alcance Instagram  | Alcance agregado (MAX por cliente/dia) | overview |
| Sessões GA4        | Tráfego do site                        | overview |
| Conversões         | Resultados Meta + Google + GA4 (CPA)   | `overviewConversions()` |

Cada card mostra **delta** vs período anterior (pill verde/vermelha).

> **Não** some conversões do pixel Meta (`meta_conversions`) em cima de Resultados — seria dobro.
> GA4 Make parou em 17/08/2026; na janela de 30 dias o GA4 pode ser zero mesmo com Meta ativo.

Se a tela ficar em branco ou “timeout”, faça **Ctrl+F5**. Os números vêm do servidor, não de um SELECT pesado na view.

### KPIs secundários

- Serviços ativos no catálogo
- Acessos de usuários vinculados
- Última sincronização global
- CTR consolidado do portfólio

### Gráficos

1. **Evolução diária** — área com investimento (Meta + Google) e conversões ao longo do período.
2. **Mix de investimento** — donut com participação por plataforma (Google, Meta, etc.).

### Listas

- **Top clientes por investimento** — clique para ir ao painel `/cliente/{slug}`.
- **Status de ingestão** — por cliente: última data recebida, plataformas ativas, volume de registros.

## Passo a passo: analisar o mês

1. Selecione **30 dias** no `PeriodToggle`.
2. Leia os hero KPIs e note deltas > 10% (investimento, conversões).
3. Abra o gráfico de evolução — identifique picos ou quedas em datas específicas.
4. No mix, verifique concentração excessiva em uma plataforma.
5. Na lista de ingestão, marque clientes com **última data antiga** → vá em **Clientes** corrigir integração.
6. No top clientes, abra os 3 primeiros para revisão com o time.

## O que NÃO fazer nesta tela

- **Não edita** cadastro de cliente — use **Clientes**.
- **Não aprova** conteúdo — use **Aprovações**.
- **Não exporta** PDF nativo — use **Relatórios** como hub e painéis individuais.

## Pré-requisitos para números corretos

1. Cliente cadastrado em **Clientes**.
2. Integrações configuradas (Meta, Google, GA4, Instagram conforme contrato).
3. Pipeline de ingestão: Meta/Instagram pelo **Hub** (crons + Puxar em Conexões). Google/GA4
   ainda dependem do Make até haver OAuth. Ver **Diagnóstico** se zerado.

## Integração com Relatórios

A aba **Relatórios** linka de volta para este dashboard como “Relatório executivo da agência”. Use Relatórios quando precisar da **lista ranqueada por cliente** com busca; use Visão geral para **gráficos e visão macro**.

## Próximo capítulo

**Relatórios** — hub de acesso por cliente e rankings detalhados.
