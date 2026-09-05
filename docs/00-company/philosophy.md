---
title: Filosofia & Princípios de Engenharia
description: Cultura, valores e princípios que guiam como construímos o Lots BI.
status: living
owner: Engenharia Lots BI
last_review: 2026-06-26
---

# Filosofia & Princípios de Engenharia

O Lots BI é um **SaaS de Business Intelligence** para agências e empresas acompanharem
indicadores de marketing em um único ambiente. Nosso trabalho é transformar dados dispersos
de várias plataformas de mídia em uma **leitura clara, confiável e acionável** — para a
agência e para o cliente final.

Missão completa: [Missão & Visão Estratégica](./mission.md)

Esta página define _como pensamos_ ao construir software. Decisões concretas derivadas
desses princípios estão registradas como [ADRs](../02-architecture/adr/README.md).

---

## Missão

> Dar a cada cliente uma visão honesta e em tempo quase real do que está acontecendo nas
> suas plataformas de marketing — sem ruído, com contexto — e dar à agência as ferramentas
> para operar isso em escala.

---

## Princípios de engenharia

### 1. Uma única fonte de verdade para cálculos

Nenhum componente de tela calcula KPI. Toda métrica, fórmula e agregação vive em uma
camada pura e testável (`src/lib/platforms/formulas.ts`, `engine.ts`, `metrics.ts`).
Dashboards apenas **consomem** resultados. Isso elimina divergência entre telas (ex.: o
mesmo CTR no admin e no cliente).

**Arquitetura alvo:** banco armazena **somente métricas oficiais** das APIs; derivadas
(CTR, CPC, CPA, CPM, engagement rate) são calculadas exclusivamente na aplicação.
**Dívida atual:** views SQL ainda calculam algumas derivadas — ver
[Modelo de métricas](../04-database/metrics-model.md) e [ADR-0007](../02-architecture/adr/0007-derived-metrics-in-application-layer.md).

### 2. Declarativo sobre imperativo

Adicionar uma plataforma de marketing não deveria exigir escrever telas novas. Descrevemos
plataformas como **dados** (`PlatformDef`) e um componente genérico as renderiza. Ver
[ADR-0002](../02-architecture/adr/0002-engine-declarativo-de-plataformas.md).

### 3. Honestidade com os dados

Não inventamos números. Quando falta dado, mostramos _empty states_ claros. Métricas com
semântica especial (ex.: alcance é contagem de pessoas únicas, não soma diária) são
tratadas explicitamente, com comentário no código explicando o porquê.

### 4. Segurança por padrão, em camadas

- Cada usuário só enxerga o que lhe pertence (RLS + `current_user_clientes()`).
- O segredo de maior privilégio (service-role) **nunca** chega ao browser (sufixo `.server.ts`).
- Toda entrada de servidor é validada com Zod.
- Cliente nunca é apagado fisicamente — usamos _soft delete_.

### 5. Migrations aditivas e idempotentes

O banco evolui sem quebrar o legado. Migrations só **adicionam** (colunas, views, tabelas),
são re-executáveis com segurança e documentam a causa-raiz da mudança no próprio arquivo.
Ver [Banco → Migrations](../04-database/migrations.md).

### 6. Operabilidade é feature

Ferramentas de diagnóstico (`/admin/debug`, `/admin/debug/views`) são parte do produto.
Se algo pode quebrar em produção, deve existir um jeito de inspecionar o estado.

### 7. Tempo é local

"Hoje" é sempre `America/Sao_Paulo`, nunca UTC. Datas são strings `YYYY-MM-DD` _date-only_.
Ver [ADR-0006](../02-architecture/adr/0006-timezone-america-sao-paulo.md).

### 8. Documentação viva

Código sem documentação atualizada é trabalho pela metade. Ver
[Padrões → Documentação como código](../09-standards/documentation.md).

### 9. Propriedade intelectual total (visão de longo prazo)

Ferramentas transitórias (Make, Lovable) aceleraram a validação, mas **não são a arquitetura
definitiva**. Toda inteligência operacional e analítica deve migrar para o ecossistema Lots BI.
Ver [ADR-0008](../02-architecture/adr/0008-proprietary-data-collectors.md) e
[ADR-0009](../02-architecture/adr/0009-platform-proprietary-infrastructure.md).

---

## Como tomamos decisões

1. Problema e contexto são escritos antes da solução.
2. Alternativas reais são consideradas (e registradas).
3. A decisão vira um [ADR](../02-architecture/adr/README.md) quando tem impacto estrutural
   ou é difícil de reverter.
4. Trade-offs ficam explícitos — não escondemos as desvantagens da escolha.

---

## O que evitamos

- **Cálculo duplicado** entre telas.
- **Acoplar componentes a plataformas específicas** (preferimos `PlatformDef`).
- **`DELETE` físico** de entidades de negócio.
- **Confiar só na UI** para segurança — a barreira real é RLS no banco.
- **Inventar dados** para preencher dashboards.
