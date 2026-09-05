---
title: "ADR-0010: Cursor como ambiente oficial de engenharia"
status: accepted
date: 2026-06-26
deciders: Engenharia Lots BI / Liderança
---

# ADR-0010: Cursor como ambiente oficial de engenharia

## Contexto

O Lots BI foi inicialmente prototipada no **Lovable**, que acelerou validação de produto e
deploy inicial. Com o amadurecimento da plataforma e a criação do **Centro de Conhecimento**
(`docs/`), o time precisa de engenharia tradicional: código versionado, PRs, revisão,
documentação como código e evolução arquitetural de longo prazo.

Até esta decisão, Lovable funcionava simultaneamente como editor visual, ambiente de
desenvolvimento e canal de deploy — criando ambiguidade sobre onde o código-fonte de verdade
vive e como features devem ser entregues.

## Problema

- Desenvolvimento split entre Lovable e repositório Git gera divergência e dívida.
- Onboarding e padrões de qualidade são difíceis de enforcear em editor externo.
- A visão de plataforma proprietária exige controle total do ciclo de engenharia.

## Decisão

1. **Cursor passa a ser o ambiente oficial de engenharia** do Lots BI.
2. **Todo desenvolvimento** acontece neste repositório (`lots-bi/`).
3. **Fluxo oficial:** Desenvolvimento → Commit → Git → GitHub → Deploy → Portal Lots BI.
4. **Lovable** é reclassificado como plataforma **transitória de build/deploy** apenas —
   não é ambiente de implementação de features.
5. Toda feature segue Definition of Done: build, lint, tipagem, documentação, ADR quando aplicável.
6. Regras enforceadas via `.cursor/rules/lots-engineering.mdc` e
   `docs/09-standards/development-workflow.md`.

## Alternativas consideradas

| Alternativa                              | Por que não                                                   |
| ---------------------------------------- | ------------------------------------------------------------- |
| Continuar Lovable como IDE principal     | Divergência com Git; difícil enforcear docs/ADRs/arquitetura  |
| Desligar Lovable imediatamente           | Build/deploy ainda depende do preset; risco operacional       |
| Desenvolvimento só via GitHub Codespaces | Cursor já adotado; sem necessidade de mudança adicional agora |

## Consequências

### Positivas

- Fonte única de verdade: o repositório Git.
- Engenharia tradicional: PRs, revisão, histórico auditável.
- Alinhamento com docs-as-code e ADRs.
- Passo concreto em direção à infraestrutura proprietária (ADR-0009).

### Negativas / transição

- Build ainda usa `@lovable.dev/vite-tanstack-config` — dependência técnica permanece.
- Sync Lovable ↔ Git pode continuar no branch conectado; cuidado com histórico (`AGENTS.md`).
- Time deve resistir a implementar features no editor Lovable por conveniência.

## Estado de implementação

| Item                                 | Status                       |
| ------------------------------------ | ---------------------------- |
| Cursor como ambiente oficial         | ✅ Decisão aceita            |
| Regra Cursor `lots-engineering.mdc` | ✅ Criada                    |
| Doc `development-workflow.md`        | ✅ Criada                    |
| Remoção dependência Lovable no build | ❌ Pendente (Fase 6 roadmap) |
| CI/CD GitHub Actions                 | ✅ ADR-0011                  |

## Critérios de conclusão da transição Lovable → deploy proprietário

- [ ] Pipeline CI/CD no GitHub (lint, test, build, deploy).
- [x] Nenhuma feature implementada via editor Lovable (política ADR-0010).
- [x] Documentação de deploy atualizada (Lovable = build/deploy transitório).
- [ ] Remoção de `@lovable.dev/vite-tanstack-config`.

## Referências

- [Fluxo oficial de desenvolvimento](../../09-standards/development-workflow.md)
- [ADR-0009 — Infraestrutura proprietária](./0009-platform-proprietary-infrastructure.md)
- [Deployment](../../08-operations/deployment.md)
