---
title: "ADR-0011: Fundação do Sistema de Engenharia"
status: accepted
date: 2026-06-26
deciders: Engenharia Lots BI / CTO
---

# ADR-0011: Fundação do Sistema de Engenharia

## Contexto

O Lots BI possuía um Engineering Handbook completo (61+ documentos) mas carecia de **infraestrutura
de engenharia executável**: CI, testes, governança de PR, validação automatizada e mandato
explícito de melhoria contínua.

Empresas de referência (Stripe, GitLab, Vercel) combinam documentação viva com gates
automatizados e processos claros — não apenas Markdown.

## Problema

- Sem CI: regressões só descobertas manualmente
- Sem testes: fórmulas e período (regras críticas) sem rede de segurança
- Sem CONTRIBUTING/PR template: qualidade inconsistente entre contribuidores
- Documentação podia divergir do processo real

## Decisão

Estabelecer o **Sistema de Engenharia Lots BI** com:

1. **Charter** — `docs/00-company/engineering-system.md`
2. **Governança** — `docs/09-standards/governance.md`, `CONTRIBUTING.md`
3. **CI** — `.github/workflows/ci.yml` (lint, test, build, validate)
4. **Testes** — Vitest + `formulas.test.ts`, `period.test.ts`
5. **Validação** — `scripts/validate-engineering.mjs`
6. **PR template** — checklist alinhado ao handbook
7. **Line endings** — `.gitattributes` + Prettier `endOfLine: lf`
8. **Regra Cursor** — `lots-governance.mdc` (melhoria proativa)
9. **Script `npm run check`** — gate local = gate CI

## Alternativas consideradas

| Alternativa             | Por que não                              |
| ----------------------- | ---------------------------------------- |
| Só documentação, sem CI | Não enforce qualidade                    |
| CI só build             | Fórmulas críticas sem testes             |
| Testes E2E primeiro     | ROI menor que unitários em `formulas.ts` |

## Consequências

### Positivas

- Primeira rede de segurança para KPIs (fonte única de verdade testada)
- PRs seguem checklist padronizado
- Divergência doc/código detectável via processo
- Base para expandir testes (engine, RLS)

### Negativas

- CI pode falhar em PRs legados (CRLF) — mitigado com `.gitattributes` + `npm run format`
- Manutenção do script `validate-engineering` ao adicionar artefatos

## Estado de implementação

| Item                             | Status     |
| -------------------------------- | ---------- |
| GitHub Actions CI                | ✅         |
| Vitest + testes fórmulas/período | ✅         |
| CONTRIBUTING + PR template       | ✅         |
| validate-engineering script      | ✅         |
| E2E / RLS tests                  | ❌ Roadmap |

## Referências

- [Sistema de Engenharia](../../00-company/engineering-system.md)
- [Governança](../../09-standards/governance.md)
- [Testing](../../09-standards/testing.md)
