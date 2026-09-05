---
title: ADR-0020 — Engineering Contracts como fundação do Platform Hub
status: Aceito
date: 2026-07-07
---

# ADR-0020 — Engineering Contracts como fundação do Platform Hub

## Contexto

O Platform Hub v3.3 foi congelado (Architecture Frozen) como infraestrutura universal de
integração da Lots BI. Antes de qualquer código de runtime, o projeto precisa de:

1. Vocabulário compartilhado e versionado entre plugins, pipeline, health e governança.
2. Regras constitucionais separadas de compatibilidade evolutiva.
3. Contratos que permitam evoluir o Hub em anos sem quebrar plugins certificados.

O fluxo de produção atual permanece intocado:

```
Make → Supabase → base_metricas → Lots BI
```

A nova infraestrutura será construída em paralelo e migrará plataforma por plataforma após
paridade funcional.

Precedentes:

- [ADR-0011](./0011-engineering-system-foundation.md) — Sistema de Engenharia Lots BI
- [ADR-0014](./0014-auth-module-v3-architecture.md) — boundaries e validação CI
- Platform Hub v3.3 — Architecture Frozen

## Decisão

### 1. Engineering Contracts como quinto pilar

| Pilar                   | Responsabilidade                                             |
| ----------------------- | ------------------------------------------------------------ |
| Engineering Contracts   | Schemas versionados, `CONSTITUTION.md`, `contract.meta.json` |
| Architecture Validation | Enforce no CI (Fase -1+)                                     |
| AI Workspace            | Contexto via `registry-report.json` (Fase -1+)               |
| Knowledge Center        | Documentação humana                                          |
| Platform Hub            | Runtime de integração (Fase 1+)                              |

### 2. Localização dos contratos

Contratos vivem em `contracts/` na raiz de `lots-bi/`, com export central em
`contracts/index.ts`.

### 3. IngestEnvelope como raiz de ingestão

`MetricBatch` é perfil `metrics-timeseries` dentro de `IngestEnvelope`, não contrato raiz.
Perfis `entity-upsert` e `event-log` estão declarados e reservados.

### 4. CONSTITUTION.md na raiz

10 regras constitucionais + processo de emenda via ADR. Compatibilidade de contratos é CI
(`validate:contracts`), não constitucional.

### 5. Fase -2 entrega somente documentação

Fase -2 cria schemas TypeScript e metadados. Zero validators, zero runtime, zero alteração do
fluxo Make.

## Alternativas consideradas

- **Contratos dentro de `src/modules/platform-hub/`** — rejeitado: contratos precedem o módulo
  e devem ser importáveis sem acoplar ao runtime.
- **JSON Schema em vez de TypeScript** — rejeitado para Fase -2: o monorepo já usa TS strict;
  validators na Fase -1 podem gerar snapshots a partir dos tipos.
- **IMMUTABLE_PRINCIPLES com 15 regras** — substituído por `CONSTITUTION.md` com 10 regras e
  processo de emenda (decisão v3.3).

## Consequências

### Positivas

- Vocabulário congelado antes do código.
- Breaking change detection possível na Fase -1.
- Plugins futuros (ERP, pagamentos) usam perfis de ingestão sem refatorar MetricPipeline.

### Negativas / dívidas

- Perfis `entity-upsert` e `event-log` declarados sem implementação (ADR futuro).
- Runtime Registry especificado mas implementação adiada (Fase 6+, ADR B).
- `contracts/` adicionado ao `tsconfig.json` — tipos ainda não consumidos pelo app até Fase 0+.

## Referências

- [`CONSTITUTION.md`](../../CONSTITUTION.md)
- [`docs/02-architecture/engineering-contracts.md`](../engineering-contracts.md)
- [`contracts/`](../../contracts/)
