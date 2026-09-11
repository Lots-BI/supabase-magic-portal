---
title: Auditoria de Completude — Engineering Handbook
description: CTO audit — cobertura da documentação, lacunas residuais e matriz de rastreabilidade.
status: living
owner: Engenharia Lots BI
last_review: 2026-09-11
---

# Auditoria de Completude — Engineering Handbook

Revisão CTO da documentação vs código. Objetivo: um engenheiro sênior entender o Lots BI
**somente lendo `docs/`**.

**Veredito (2026-09-11):** handbook alinhado ao merge Hub (PR #2): ingestão Hub, RPC de
overview, produção Vercel, migrations **01→57**. Lacunas honestas: OAuth Google (P14),
staging, canais on-call.

---

## Cobertura por domínio

| Domínio                        | Status     | Documentos principais                                |
| ------------------------------ | ---------- | ---------------------------------------------------- |
| Arquitetura (atual + alvo)     | ✅         | `02-architecture/*`, ADRs 0001–0010                  |
| Banco / schema / views         | ✅         | `04-database/*`                                      |
| RLS / policies                 | ✅         | `04-database/rls-policies.md`                        |
| Modelo de métricas             | ✅         | `04-database/metrics-model.md`                       |
| Frontend / rotas / UI          | ✅         | `05-frontend/*`                                      |
| Estrutura do repositório       | ✅         | `05-frontend/repository-structure.md`                |
| Engine de métricas             | ✅         | `06-engine/*`                                        |
| PlatformDef catálogo           | ✅         | `06-engine/platform-catalog.md`                      |
| Fórmulas                       | ✅         | `06-engine/formulas.md`                              |
| Dashboards analíticos          | ✅         | `06-dashboards/dashboards.md`                        |
| Módulos admin/editorial        | ✅         | `06-dashboards/admin-modules.md`                     |
| AI Workspace (Context Pack IA) | ✅         | `06-dashboards/ai-workspace.md` — owner-only         |
| Backend / API                  | ✅         | `03-backend/api-reference.md`                        |
| Auth / segurança               | ✅         | `03-backend/auth.md`, `security.md`                  |
| Integrações / Hub / Make leftover | ✅         | `07-integrations/*` (hub + make)             |
| Deploy / ambientes             | ✅         | Vercel `lotsbi.leandromajr.com`; CF opcional |
| CI/CD                          | ✅         | `08-operations/cicd.md` + `.github/workflows/ci.yml` |
| Testes                         | ✅ Parcial | `09-standards/testing.md` — fórmulas + período       |
| Observabilidade                | ⚠️         | Documentado atual + alvo; APM ausente                |
| Filosofia / missão             | ✅         | `00-company/*`                                       |
| Padrões / fluxo / convenções   | ✅         | `09-standards/*`                                     |
| Onboarding                     | ✅         | `START_HERE.md`, `10-onboarding/`                    |
| Troubleshooting                | ✅         | `08-operations/troubleshooting.md`                   |
| Glossário                      | ✅         | `00-company/glossary.md`                             |
| Roadmap / changelog            | ✅         | `11-roadmap/`, `12-changelog/`                       |
| ADRs                           | ✅         | 10 registros                                         |
| Cursor rules                   | ✅         | `.cursor/rules/*.mdc`                                |
| `.env.example`                 | ✅         | Raiz do projeto                                      |

Legenda: ✅ completo · ⚠️ parcial (lacuna marcada)

---

## Matriz código → documentação

| Código                            | Documentado em                                                  |
| --------------------------------- | --------------------------------------------------------------- |
| `src/lib/platforms/*`             | `06-engine/*`                                                   |
| `src/modules/dashboards/admin-portfolio.server.ts` | `03-backend/api-reference.md`, `06-dashboards/admin-modules.md` |
| `src/lib/metrics.ts`              | `06-engine/overview-aggregation.md`                             |
| `src/lib/period.ts`               | `06-engine/period.md`                                           |
| `src/lib/admin.functions.ts`      | `03-backend/api-reference.md`                                   |
| `src/lib/editorial.functions.ts`  | `03-backend/api-reference.md`, `06-dashboards/admin-modules.md` |
| `src/lib/integrations-catalog.ts` | `07-integrations/integrations.md`                               |
| `src/integrations/supabase/*`     | `03-backend/auth.md`, `overview.md`                             |
| `src/routes/**`                   | `05-frontend/routing.md`, `06-dashboards/*`                     |
| `src/components/lots/*`          | `05-frontend/component-system.md`                               |
| `src/hooks/*`                     | `05-frontend/component-system.md` (parcial)                     |
| `src/lib/error-*.ts`              | `05-frontend/observability-errors.md`                           |
| `supabase/migrations-official/*`  | `04-database/migrations.md`, `schema.md`, `views.md`            |
| `.env.example`                    | `08-operations/deployment.md`, `environments.md`                |

---

## Lacunas residuais (honestas)

Informação **não disponível** no repositório — marcada, não inventada:

| #   | Lacuna                          | Onde registrar                             |
| --- | ------------------------------- | ------------------------------------------ |
| L1  | Schema Make versionado (52)     | ✅ `04-database/schema.md`                 |
| L2  | Cenários Make (detalhe)         | `07-integrations/current-pipeline-make.md` |
| L3  | URL produção                    | ✅ `https://lotsbi.leandromajr.com`        |
| L4  | Ambiente staging                | `08-operations/environments.md`            |
| L5  | Canais do time / on-call        | `10-onboarding/onboarding.md`              |
| L6  | Identidade Lots BI              | ✅                                         |
| L7  | Horizons                        | N/A — não encontrado                       |
| L8  | Suite de testes                 | ✅ Parcial (fórmulas, período, mappers)    |
| L9  | GitHub Actions                  | ✅ CI + crons Hub                          |
| L10 | OAuth Google Ads (P14)          | `13-platform-hub/next-steps.md`            |

---

## Dívidas técnicas documentadas

Todas rastreadas em `11-roadmap/roadmap.md` (D1–D15) e ADRs correspondentes.

---

## Roteiro sênior (4 horas)

| Hora | Leitura                                                                  |
| ---- | ------------------------------------------------------------------------ |
| 1    | `START_HERE` → `mission` → `current-state` → `target-architecture`       |
| 2    | `06-engine/overview` → `platform-catalog` → `formulas` → `metrics-model` |
| 3    | `auth` → `security` → `rls-policies` → `api-reference`                   |
| 4    | `admin-modules` → `integrations` → `runbook` → `roadmap`                 |

Após 4h o engenheiro deve conseguir: implementar feature, criar PlatformDef, debugar dashboard
vazio, e seguir fluxo de PR com docs.

---

## Histórico de auditorias

| Data       | Escopo                           | Resultado                            |
| ---------- | -------------------------------- | ------------------------------------ |
| 2026-06-26 | Handbook inicial + fluxo Cursor  | 31 docs                              |
| 2026-09-11 | Hub ingest + overview RPC + Vercel | Docs + KC alinhados ao PR #2     |

---

## Artefatos do Sistema de Engenharia

| Artefato   | Caminho                                                          |
| ---------- | ---------------------------------------------------------------- |
| Charter    | `docs/00-company/engineering-system.md`                          |
| Governança | `docs/09-standards/governance.md`                                |
| CI         | `.github/workflows/ci.yml`                                       |
| Validação  | `scripts/validate-engineering.mjs`                               |
| Gate       | `npm run check`                                                  |
| ADR        | `docs/02-architecture/adr/0011-engineering-system-foundation.md` |

---

## Manutenção

Esta página deve ser atualizada quando:

- Nova seção `docs/` for criada
- Lacuna L1–L9 for resolvida
- Auditoria trimestral de completude
