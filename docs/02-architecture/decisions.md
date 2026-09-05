---
title: Arquitetura — Decisões (resumo)
description: Resumo narrativo das principais escolhas arquiteturais e seus porquês.
status: living
owner: Engenharia Lots BI
last_review: 2026-06-26
---

# Decisões Arquiteturais (resumo)

Este documento resume o "porquê" das escolhas estruturais. Cada decisão tem um
[ADR](./adr/README.md) formal com contexto, alternativas e consequências.

## Por que TanStack Start + Supabase?

Permite uma stack **full-stack TypeScript** sem manter um backend separado: SSR e server
functions no mesmo projeto, com Postgres gerenciado, Auth e RLS prontos. A plataforma
Lovable acelera o ciclo de desenvolvimento. → [ADR-0001](./adr/0001-tanstack-start-supabase.md)

## Por que um engine declarativo de plataformas?

Adicionar uma nova fonte de marketing não deveria exigir telas novas. Plataformas são
descritas como dados (`PlatformDef`) e um componente genérico (`PlatformDashboard`) as
renderiza. Isso reduz duplicação e mantém **uma única fonte de verdade** para cálculos.
→ [ADR-0002](./adr/0002-engine-declarativo-de-plataformas.md)

## Por que as views são SECURITY DEFINER?

`base_metricas` tem RLS habilitada mas **sem policy** para `authenticated`. Com views
`security_invoker`, todo dashboard ficava vazio (inclusive para admin). A correção foi
tornar as views `SECURITY DEFINER`, lendo a tabela como owner, mantendo a isolação no
`WHERE current_user_clientes()`. É um trade-off conhecido e tem dívida associada.
→ [ADR-0003](./adr/0003-views-security-definer.md)

## Por que a chave de cliente é por nome (texto)?

Herança da planilha/Make legados: `base_metricas.cliente` é texto e diverge do
`cadastro_clientes.nome_cliente`. Em vez de reescrever o pipeline, criamos
`cliente_aliases` + `COALESCE` para reconciliar. Funciona, mas é dívida técnica a migrar
para FK por ID. → [ADR-0004](./adr/0004-chave-de-cliente-por-nome-e-aliases.md)

## Por que separar anon e service-role?

Defesa em profundidade. O browser só recebe a chave anon (sempre sob RLS). A service-role
(bypass de RLS) vive apenas no servidor, em arquivos `.server.ts` que não podem ser
importados no client. → [ADR-0005](./adr/0005-server-functions-anon-vs-service-role.md)

## Por que timezone fixo America/Sao_Paulo?

`new Date().toISOString()` retorna o dia em UTC, deslocando o "hoje" entre 21h e 23h59 BRT.
Toda a aritmética de datas usa strings `YYYY-MM-DD` e o fuso de São Paulo.
→ [ADR-0006](./adr/0006-timezone-america-sao-paulo.md)

---

## Decisões alvo (visão futura — ainda não implementadas)

### Por que métricas derivadas só na aplicação?

Evitar divergência entre dashboards e permitir evolução de fórmulas sem migration SQL.
**Gap atual:** views SQL ainda calculam CTR, CPM e engagement_rate.
→ [ADR-0007](./adr/0007-derived-metrics-in-application-layer.md)

### Por que coletores proprietários em vez de Make?

Versionamento, testes, observabilidade e escala para centenas de clientes.
→ [ADR-0008](./adr/0008-proprietary-data-collectors.md)

### Por que infraestrutura proprietária (sem Lovable/Make)?

Propriedade intelectual total e controle operacional de ponta a ponta.
→ [ADR-0009](./adr/0009-platform-proprietary-infrastructure.md)

### Por que Cursor como ambiente oficial de engenharia?

Engenharia tradicional versionada no Git; Lovable rebaixado a build/deploy transitório.
→ [ADR-0010](./adr/0010-cursor-official-development-environment.md)

### Por que fundação do Sistema de Engenharia?

CI, testes, governança e validação automatizada — docs sozinhos não enforce qualidade.
→ [ADR-0011](./adr/0011-engineering-system-foundation.md)

Ver também: [Sistema de Engenharia](../00-company/engineering-system.md) · [Governança](../09-standards/governance.md)
