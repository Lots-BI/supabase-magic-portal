---
title: Plano Estratégico — Centro de Inteligência
description: Módulo de planejamento estratégico integrado a métricas, editorial e timeline colaborativa.
status: living
owner: Engenharia / Produto Lots BI
last_review: 2026-06-29
---

# Plano Estratégico — Centro de Inteligência

O **Plano Estratégico** é o centro operacional entre agência e cliente. Não é CRM nem gerenciador
de tarefas — é o planejamento estratégico vivo, conectado às métricas da plataforma.

## Funil da aba inteligente (1:1)

Rota de entrada: `/cliente/$cliente/plano-estrategico`

| Estado | Condição | UI |
| ------ | -------- | --- |
| 1 · Quiz | `quiz_completed_at` nulo | `QuizForm` |
| 2 · Transição | quiz ok, `has_active_plan` falso | `PendingPlan` |
| 3 · Plano ativo | `has_active_plan` + `plan_data` | `ActivePlanDashboard` |

Tabela: `plano_alinhamentos` (`31_plano_alinhamento.sql`) — um registro por `cadastro_cliente_id`.

Admin publica a proposta em `/admin/plano-estrategico` (`publishAlinhamentoPlan`).
Clientes que já tinham Centro operacional sem quiz continuam sendo redirecionados ao `$planoId`.

## Rotas

| Rota                                           | Público         | Função                                              |
| ---------------------------------------------- | --------------- | --------------------------------------------------- |
| `/plano-estrategico`                           | Cliente + admin | Hub — um plano ativo por cliente                    |
| `/cliente/$cliente/plano-estrategico`          | Cliente + admin | Bootstrap: cria ou redireciona ao plano único       |
| `/cliente/$cliente/plano-estrategico/$planoId` | Colaborativo    | **Centro Estratégico** (objetivo atual + histórico) |
| `/admin/plano-estrategico`                     | Admin           | Criar plano (apenas clientes sem plano ativo)       |

## Conceito

- **Um plano contínuo por cliente** — documento vivo de longo prazo.
- **Objetivos sucessivos** — cada objetivo tem título, descrição, período, meta, progresso e fase
  (Planejamento → Em andamento → Em validação → Concluído/Cancelado).
- **Estratégias, hipóteses e roadmap** pertencem ao objetivo atual.
- **Decisões e aprendizados** permanecem no histórico do plano.

A rota pai `plano-estrategico` é um **layout route** (`<Outlet />`); a listagem fica em
`plano-estrategico.index.tsx` e o centro em `plano-estrategico.$planoId.tsx`.
| `/admin/plano-estrategico` | Admin | Criar e listar planos |

## Layout do Centro Estratégico

Ordem visual (narrativa, não CRUD):

1. Diagnóstico Atual (automático)
2. Radar Executivo
3. Objetivos ativos (+ relacionamentos com estratégias)
4. Hipóteses (fluxo visual)
5. Estratégias (peso % + contadores editoriais)
6. Oportunidades (manual + regras)
7. Roadmap
8. Decisões
9. Aprendizados
10. KPIs e alertas
11. Timeline
12. Próximos Passos (rodapé)

Edição via **Gerenciar** (drawer colaborativo).

## Dados

Migration: `supabase/migrations-official/11_plano_estrategico.sql`

Tabelas principais: `planos_estrategicos`, `plano_objetivos`, `plano_estrategias`,
`plano_objetivo_estrategias`, `plano_metric_refs`, `plano_hipoteses`, `plano_oportunidades`,
`plano_decisoes`, `plano_aprendizados`, `plano_roadmap_marcos`, `plano_acoes`, `plano_eventos`,
`plano_snapshots`.

KPIs **nunca duplicados** — apenas referência (`platform_key` + `metric_key`/`kpi_key`).

## Código

| Camada           | Local                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Tipos + motores  | `src/lib/strategic-plan/`                                                                         |
| Server functions | `src/lib/strategic-plan.functions.ts`                                                             |
| UI               | `src/components/lots/strategic-plan/`                                                            |
| Rotas cliente    | `cliente.$cliente.plano-estrategico.tsx` (layout), `.index.tsx` (lista), `.$planoId.tsx` (centro) |
| Testes           | `src/lib/strategic-plan/*.test.ts`                                                                |

## Integrações

- **Métricas:** `getStrategicDashboard` → `engine.ts` + views `vw_*_diario`
- **Editorial:** `posts_editorial.estrategia_id`, view `vw_estrategia_editorial_stats`
- **Global Search:** rotas estáticas + hub de planos
- **Knowledge Center:** este documento

## ADR

Ver [ADR-0013](../02-architecture/adr/0013-plano-estrategico-centro-estrategico.md).
