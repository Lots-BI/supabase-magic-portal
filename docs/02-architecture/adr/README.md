---
title: Architecture Decision Records (ADRs)
description: Índice e processo dos registros de decisão arquitetural do Lots BI.
status: living
owner: Engenharia Lots BI
last_review: 2026-06-30
---

# Architecture Decision Records (ADRs)

Um **ADR** registra uma decisão arquitetural relevante: o contexto que a motivou, a decisão
tomada, as alternativas consideradas e as consequências (boas e ruins). Usamos o formato
[MADR](https://adr.github.io/madr/) simplificado.

## Quando criar um ADR

Crie um ADR quando a decisão:

- é difícil de reverter (estrutural);
- afeta segurança, modelo de dados ou limites do sistema;
- escolhe entre alternativas com trade-offs significativos;
- as pessoas vão perguntar "por que foi feito assim?" daqui a 6 meses.

## Índice

| ADR                                                       | Título                                         | Status              |
| --------------------------------------------------------- | ---------------------------------------------- | ------------------- |
| [0001](./0001-tanstack-start-supabase.md)                 | TanStack Start + Supabase como base            | Aceito              |
| [0002](./0002-engine-declarativo-de-plataformas.md)       | Engine declarativo de plataformas              | Aceito              |
| [0003](./0003-views-security-definer.md)                  | Views analíticas como SECURITY DEFINER         | Aceito (com dívida) |
| [0004](./0004-chave-de-cliente-por-nome-e-aliases.md)     | Chave de cliente por nome + aliases            | Aceito (com dívida) |
| [0005](./0005-server-functions-anon-vs-service-role.md)   | Separação anon vs service-role                 | Aceito              |
| [0006](./0006-timezone-america-sao-paulo.md)              | Timezone fixo America/Sao_Paulo                | Aceito              |
| [0007](./0007-derived-metrics-in-application-layer.md)    | Métricas derivadas na camada de aplicação      | Proposto (alvo)     |
| [0008](./0008-proprietary-data-collectors.md)             | Coletores proprietários substituem Make        | Proposto (alvo)     |
| [0009](./0009-platform-proprietary-infrastructure.md)     | Infraestrutura proprietária (sem Lovable/Make) | Proposto (alvo)     |
| [0010](./0010-cursor-official-development-environment.md) | Cursor como ambiente oficial de engenharia     | Aceito              |
| [0011](./0011-engineering-system-foundation.md)           | Fundação do Sistema de Engenharia              | Aceito              |
| [0012](./0012-internal-infrastructure-transition.md)      | Transição para infraestrutura interno Lots BI    | Aceito              |
| [0013](./0013-plano-estrategico-centro-estrategico.md)    | Plano Estratégico — Centro de Inteligência     | Aceito              |
| [0014](./0014-auth-module-v3-architecture.md)             | Auth Module v3 — Auth, Access e Admin          | Aceito              |
| [0018](./0018-content-workflow-module-v1.md)              | Content Workflow Module v1 (Aprovações)        | Aceito              |
| [0019](./0019-os-core-layer.md)                           | OS Core Layer                                  | Aceito              |
| [0020](./0020-engineering-contracts-platform-hub.md)      | Engineering Contracts — Platform Hub v3.3      | Aceito              |
| [0021](./0021-platform-hub-ports-fase-0.md)               | Platform Hub ports (Fase 0)                    | Aceito              |
| [0022](./0022-hub-registry-fase-1.md)                     | Implementação Hub Registry (Fase 1)            | Aceito              |
| [0023](./0023-modulo-estrutura-fase-2.md)                 | Estrutura do módulo sem runtime (Fase 2)       | Aceito              |

## Template

```markdown
---
title: ADR-XXXX — Título curto
status: Proposto | Aceito | Substituído por ADR-YYYY | Descontinuado
date: AAAA-MM-DD
---

# ADR-XXXX — Título

## Contexto

Qual problema/força motivou a decisão.

## Decisão

O que foi decidido (no presente, afirmativo).

## Alternativas consideradas

- Alternativa A — por que não.
- Alternativa B — por que não.

## Consequências

### Positivas

### Negativas / dívidas
```
