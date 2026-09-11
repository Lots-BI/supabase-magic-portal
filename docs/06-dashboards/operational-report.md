---
title: Relatório operacional — canvas visual por cliente
description: Resumo do período com números principais e gráficos. Plataforma sem coleta não aparece.
status: living
owner: Engenharia Lots BI
tags: [relatorio, clientes, produto]
difficulty: beginner
last_review: 2026-09-11
---

# Relatório operacional

Tela **visual** do que aconteceu no recorte — não um inventário analítico.

| Item | Detalhe |
| ---- | ------- |
| Cliente | `/cliente/{slug}/relatorio` (menu **Relatório**) |
| Admin | `/admin/relatorios` → clique na linha (mesmo período 7/30/90) |
| Engine | `src/modules/operational-report/` |
| UI | `src/components/lots/operational-report/ClientOperationalReport.tsx` |

## Regras de produto

1. **Só números principais** — até 4 heróis, até 3 métricas por plataforma, até 3 movimentos.
2. **Plataforma inativa some** — se não houver linha no período, o tile da marca não entra no relatório.
3. **Publicações / Conteúdos** só aparecem se houver peça no recorte.
4. **Não inventa** — headline vazia quando não há coleta.

## O que a tela mostra

- Cartaz com a frase do período e selo (No ritmo / Estável / Atenção).
- Heróis com barra deste recorte vs o anterior.
- Pulso (área) e mix de investimento (donut) quando Meta e Google existem juntos.
- Tiles da marca (Meta, Google Ads, Instagram, GA4, GBP) com sparkline.
- Publicações em barras; Conteúdos em anel publicados / calendário.

## Fontes

Coletas do Hub (views `vw_*_diario`), `vw_ig_media_dashboard`, `content_cards`. Fallback de heróis: `vw_overview_cliente` se a view da plataforma falhar.

Novidades: `src/content/platform-news/releases.ts` (`2026-09-11-relatorio-visual`). Tutorial cliente `11-relatorio`; admin `04-relatorios`.
