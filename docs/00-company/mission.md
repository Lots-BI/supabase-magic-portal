---
title: Missão & Visão Estratégica
description: Propósito do Lots BI, visão de longo prazo e posicionamento como SaaS de BI.
status: living
owner: Liderança / Engenharia Lots BI
last_review: 2026-06-26
---

# Missão & Visão Estratégica

---

## Missão

> Transformar dados brutos de marketing em **informações confiáveis** para tomada de decisão —
> em um único ambiente, para agências e empresas que operam em escala.

O Lots BI existe para que gestores de marketing, analistas e clientes finais possam confiar nos
números que veem nos dashboards — sem divergência entre telas, sem cálculos ocultos e sem
dependência de planilhas paralelas.

---

## Visão de produto

Consolidar indicadores de **diversas plataformas de marketing** em dashboards especializados
por canal, mais uma **visão consolidada** cross-channel.

Plataformas na visão de produto (estratégica):

| Plataforma              | Estado no repositório |
| ----------------------- | --------------------- |
| Google Ads              | Implementada          |
| Meta Ads                | Implementada          |
| Instagram               | Implementada          |
| Google Analytics 4      | Implementada          |
| Google Business Profile | Parcial (catálogo)    |
| TikTok                  | Parcial (catálogo)    |
| LinkedIn Ads            | Não implementada      |
| Pinterest               | Não implementada      |
| YouTube                 | Não implementada      |
| Futuras integrações     | Roadmap               |

---

## Visão de longo prazo (estratégica)

O Lots BI deve tornar-se uma **plataforma completamente proprietária**. No futuro, toda a
inteligência operacional e analítica deve residir dentro do ecossistema Lots BI.

### Ferramentas a serem substituídas

| Ferramenta   | Papel hoje                               | Status no repo                                                                           |
| ------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Make**     | Coleta e ingestão de métricas → Supabase | Usado operacionalmente; **não versionado** neste repositório                             |
| **Lovable**  | Build/deploy transitório                 | Confirmado via `@lovable.dev/vite-tanstack-config`; **não** é ambiente de dev (ADR-0010) |
| **Horizons** | Citado na visão estratégica              | **⚠️ INFORMAÇÃO NÃO ENCONTRADA** no repositório                                          |

### Arquitetura alvo (resumo)

```
APIs Oficiais → Coletores Proprietários → Fila → Banco de Dados
→ Camada de Agregação → Motor de Métricas → API Interna → Frontend
```

Detalhamento: [Arquitetura alvo](../02-architecture/target-architecture.md)

---

## Diferenciação

| Aspecto                | Lots BI (alvo)                                | Planilhas / ferramentas isoladas |
| ---------------------- | ------------------------------------------- | -------------------------------- |
| Fonte única de verdade | Sim — regras centralizadas                  | Não — fórmulas duplicadas        |
| Multi-plataforma       | Dashboards por canal + overview             | Silos por ferramenta             |
| Confiança nos números  | Métricas oficiais + cálculo auditável       | Dados inconsistentes             |
| Escala                 | Centenas de clientes, milhares de syncs/dia | Não escala                       |

---

## Estado atual vs visão (honestidade técnica)

**Fato observado:** o produto atual validou rapidamente a proposta usando Make, Lovable e
Supabase — escolhas corretas para **time-to-market**, mas **não representam a arquitetura
definitiva**.

**Recomendação documentada:** evoluir incrementalmente em direção à arquitetura alvo, sem
big-bang rewrite. Cada fase do [roadmap](../11-roadmap/roadmap.md) aproxima a plataforma da
visão proprietária.

---

## Marca

O produto chama-se **Lots BI**. Esse é o nome exibido na UI, no PWA e no preview de
compartilhamento (WhatsApp, LinkedIn, X).
