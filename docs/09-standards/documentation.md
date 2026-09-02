---
title: Documentação como Código (Doc-as-Code)
description: Como a documentação da Lotus é mantida viva e atualizada a cada feature.
status: living
owner: Engenharia Lotus
last_review: 2026-06-26
---

# Documentação como Código

> **Regra de ouro:** toda funcionalidade nova ou mudança relevante de comportamento deve vir
> acompanhada da atualização da documentação correspondente, **no mesmo Pull Request**.

A documentação da Lotus mora no Git, em Markdown, ao lado do código. **Entrada principal:**
[`docs/START_HERE.md`](../START_HERE.md). Não é um artefato separado que envelhece — é parte
da Definition of Done.

---

## Princípios

1. **Mesma mudança, mesmo PR.** Código e docs andam juntos. PR que muda comportamento sem
   tocar docs deve ser questionado na revisão.
2. **Fonte única por assunto.** Cada tema tem um lar (ver índice em
   [`docs/README.md`](../README.md)). Não duplicar — referenciar.
3. **Engenharia no Cursor.** Desenvolvimento oficial neste repo — ver
   [Fluxo oficial](./development-workflow.md).
4. **Honestidade.** Se algo não foi confirmado no código, marque com o bloco
   `> ⚠️ INFORMAÇÃO NÃO ENCONTRADA`, não invente.
5. **Frontmatter sempre.** `title`, `description`, `status`, `owner`, `last_review`.
6. **Diagramas em Mermaid** (renderizam no GitHub e em futuros portais de docs).

---

## Matriz: o que muda → o que documentar

| Você mudou…                           | Atualize                                                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Uma server function (nova/assinatura) | [API Reference](../03-backend/api-reference.md)                                                                                  |
| Auth / roles / signup policy          | [Auth](../03-backend/auth.md), [Segurança](../03-backend/security.md)                                                            |
| Tabela/coluna/RLS                     | [Schema](../04-database/schema.md), [RLS](../04-database/rls-policies.md), [Migrations](../04-database/migrations.md)            |
| Uma view `vw_*`                       | [Views](../04-database/views.md)                                                                                                 |
| PlatformDef / engine / fórmulas       | [06-engine/](../06-engine/overview.md), [Dashboards](../06-dashboards/dashboards.md)                                             |
| `metrics.ts` / `period.ts`            | [overview-aggregation](../06-engine/overview-aggregation.md), [period](../06-engine/period.md)                                   |
| Integração / ID técnico / Make        | [Integrações](../07-integrations/integrations.md)                                                                                |
| Rota nova / tela admin                | [Roteamento](../05-frontend/routing.md), [admin-modules](../06-dashboards/admin-modules.md)                                      |
| Variável de ambiente / deploy / CI    | [Deployment](../08-operations/deployment.md), [environments](../08-operations/environments.md), [cicd](../08-operations/cicd.md) |
| Erros / logging                       | [observability-errors](../05-frontend/observability-errors.md), [observability](../08-operations/observability.md)               |
| Estratégia de testes                  | [testing](../09-standards/testing.md)                                                                                            |
| Decisão estrutural                    | Novo [ADR](../02-architecture/adr/README.md)                                                                                     |
| Qualquer coisa visível ao usuário     | [Changelog](../12-changelog/changelog.md), [Novidades](../06-dashboards/platform-news.md) (`src/content/platform-news/releases.ts`), tutorial |
| Nova seção ou lacuna resolvida        | [AUDIT](../AUDIT.md), [README](../README.md)                                                                                     |

---

## Checklist de PR (copiar na descrição)

```md
### Documentação

- [ ] Atualizei a(s) página(s) de docs afetada(s) (ver matriz em 09-standards/documentation.md)
- [ ] Criei um ADR se a decisão é estrutural
- [ ] Adicionei entrada no Changelog (se visível ao usuário)
- [ ] `last_review` atualizado nos docs alterados
- [ ] Marquei lacunas com "⚠️ INFORMAÇÃO NÃO ENCONTRADA" em vez de assumir
```

---

## Automação no Cursor

Regras de projeto em `.cursor/rules/`:

| Regra                                                                | Função                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------- |
| [`lotus-engineering.mdc`](../../.cursor/rules/lotus-engineering.mdc) | Fluxo oficial, qualidade, arquitetura, Definition of Done |
| [`docs-maintenance.mdc`](../../.cursor/rules/docs-maintenance.mdc)   | Matriz código → docs; doc-as-code                         |

Elas instruem o agente a manter código e documentação alinhados no mesmo trabalho.

> **Evolução futura sugerida:** um check de CI que falha o PR se arquivos de `src/lib/*.functions.ts`,
> `supabase/migrations-official/**` ou `src/lib/platforms/**` mudarem sem mudança correspondente
> em `docs/**`. Registrado no [Roadmap](../11-roadmap/roadmap.md).

---

## Revisão periódica

Cada documento tem `last_review`. Revisão trimestral sugerida: percorrer os docs, validar
contra o código e atualizar a data. Documentos `status: living` são esperados mudar com
frequência.
