---
title: Glossário de Domínio
description: Vocabulário comum de negócio e técnico usado no Lots BI.
status: living
owner: Engenharia Lots BI
last_review: 2026-09-11
---

# Glossário de Domínio

Termos usados de forma consistente em todo o código e na documentação.

| Termo                       | Definição                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lots BI**                   | Nome da plataforma/produto documentada neste handbook.                                                                                                  |
| **Cliente**                 | Empresa atendida pela agência, cadastrada em `cadastro_clientes`. Também é o nome do perfil de usuário final que só vê os próprios dados.               |
| **Admin**                   | Usuário interno da agência. Enxerga todos os clientes e o painel administrativo. Papel definido em `user_roles`.                                        |
| **Plataforma**              | Fonte de métricas de marketing: Meta Ads, Google Ads, GA4, Instagram, Google Business, TikTok.                                                          |
| **base_metricas_make / _hub** | Tabelas long da ingestão. Hub = official_api (replace-by-day). Make = leftover. |
| **prefer_hub**              | View: se o Hub tem o dia (sem sentinela vazia), o Make daquele dia não entra. XOR `ph_metricas_source` não é virado. |
| **portfolio_overview**      | RPC do admin (visão geral / relatórios). Evita SELECT 8-union no browser. |
| **View analítica**          | View Postgres `vw_*` que normaliza e agrega `base_metricas` para consumo direto pelo frontend.                                                          |
| **Alias de cliente**        | Reconciliação entre o nome do cliente em `base_metricas` (vindo do Make) e o nome canônico em `cadastro_clientes`. Tabela `cliente_aliases`.            |
| **Nome canônico**           | O `nome_cliente` oficial do cadastro. Toda a UI usa o nome canônico.                                                                                    |
| **Slug**                    | Identificador URL-safe do cliente (`/cliente/{slug}`), único em `cadastro_clientes`.                                                                    |
| **client_access**           | Tabela que concede a um usuário acesso a um cliente específico.                                                                                         |
| **current_user_clientes()** | Função Postgres `SECURITY DEFINER` que retorna a lista de clientes visíveis ao usuário logado. Coração da isolação multi-tenant.                        |
| **RLS**                     | Row Level Security do Postgres — políticas que filtram linhas por usuário.                                                                              |
| **Server Function**         | Função do TanStack Start executada no servidor, com validação de token e Zod. Ver [API Reference](../03-backend/api-reference.md).                      |
| **Cursor**                  | Ambiente oficial de engenharia (ADR-0010). Desenvolvimento no repositório Git.                                                                          |
| **PlatformDef**             | Descrição declarativa de uma plataforma (métricas, agregações, KPIs, gráficos). Catálogo: [platform-catalog](../06-engine/platform-catalog.md).         |
| **Engine**                  | Camada de funções puras (`engine.ts`, `formulas.ts`, `metrics.ts`). Visão: [overview](../06-engine/overview.md).                                        |
| **KPI**                     | Indicador derivado de totais (CTR, CPC, CPM, CPA). Calculado por `formulas.ts` — nunca no banco (alvo).                                                 |
| **MetricDef**               | Métrica oficial declarada em `PlatformDef` com estratégia de agregação (sum, max, …).                                                                   |
| **Overview**                | Linha consolidada por cliente/dia (`vw_overview_cliente`). Agregação em `metrics.ts`.                                                                   |
| **Period / resolvePeriod**  | Janela temporal BRT com comparativo. Ver [period.md](../06-engine/period.md).                                                                           |
| **SECURITY DEFINER**        | Funções (ex. `current_user_clientes`) rodam como owner. Views `vw_*` usam `security_invoker` (51). ADR-0003 = workaround antigo. |
| **Make**                    | Leftover de ingestão (Google/GA4 e histórico). Não é a fonte viva de Meta/IG. |
| **Platform Hub**            | Kernel de conexões + official_api. Crons + Puxar. `/admin/conexoes`. |
| **Vercel**                  | Host de produção (`lotsbi.leandromajr.com`). Cloudflare `deploy.yml` é manual. |
| **micros**                  | Unidade do Google Ads para custo (1 unidade monetária = 1.000.000 micros). Convertida nas views.                                                        |
| **service-role**            | Chave Supabase de privilégio máximo, usada só no servidor (`client.server.ts`).                                                                         |
| **anon key**                | Chave pública Supabase usada no browser, sempre sujeita à RLS.                                                                                          |
