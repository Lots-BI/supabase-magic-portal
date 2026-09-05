---
title: Padrões de Desenvolvimento
description: Convenções de código, estrutura, segurança e fluxo de contribuição.
status: living
owner: Engenharia Lots BI
last_review: 2026-06-26
---

# Padrões de Desenvolvimento

## Linguagem & ferramentas

- **TypeScript** em todo o código. Evite `any` (há débito em alguns helpers admin — não
  amplie).
- **ESLint** (`npm run lint`) + **Prettier** (`npm run format`). Rode antes de abrir PR.
- Imports usam o alias `@` → `src/` (configurado no preset Vite/tsconfig).

## Estrutura & responsabilidades

- **Cálculo de negócio vive em `src/lib`** (puro, testável). Componentes só exibem.
- **Fórmulas só em `src/lib/platforms/formulas.ts`.** Nunca recriar CTR/CPC/etc. em telas.
- **Nova plataforma = `PlatformDef` + registry** (ver
  [Design System](../05-frontend/component-system.md)). Não criar telas por plataforma.
- **Datas via `src/lib/period.ts`.** Nunca `new Date().toISOString()` para "hoje".
- **Roteamento file-based.** `routeTree.gen.ts` é gerado — não editar à mão.

## Segurança (não negociável)

- Toda server function: `requireSupabaseAuth` + validação **Zod** + `assertAdmin` quando exige
  papel.
- **service-role só em `.server.ts`**, importada dinamicamente. Nunca prefixar com `VITE_`.
- A barreira real é **RLS no banco** — esconder um botão na UI não é segurança.
- **Soft delete** para entidades de negócio (cliente). `DELETE` físico só onde já existe
  (posts).

## Banco

- Migrations **aditivas e idempotentes**, numeradas, com cabeçalho explicando a causa-raiz.
  Ver [migrations](../04-database/migrations.md).
- Ao criar tabela: GRANTs + `ENABLE ROW LEVEL SECURITY` + policies (admin all / cliente select).

## Comentários

- Comente **o porquê**, não o óbvio. Os arquivos do engine e as migrations são bons exemplos:
  explicam decisão e trade-off, não narram a linha.

## Git & versionamento

> **Ambiente oficial:** Cursor + este repositório. Ver
> [Fluxo oficial de desenvolvimento](./development-workflow.md) e [ADR-0010](../02-architecture/adr/0010-cursor-official-development-environment.md).

- Todo desenvolvimento acontece no código versionado — **não** no editor Lovable.
- Branch conectado ao deploy: **não reescrever histórico publicado** (sem force-push,
  rebase/amend/squash de commits já enviados). Ver [deployment](../08-operations/deployment.md).
- Mantenha o branch sempre funcional.
- Commits descritivos; PRs pequenos e revisáveis; código pronto para produção.

## Definition of Done

Uma mudança só está "pronta" quando:

- [ ] Compila e passa no lint/build/test (`npm run check`).
- [ ] Respeita os padrões acima (cálculo no `lib`, segurança, datas).
- [ ] Migrations (se houver) são aditivas, idempotentes e validadas.
- [ ] **Documentação atualizada no mesmo PR** (ver
      [Documentação como código](./documentation.md)).
- [ ] Entrada no [Changelog](../12-changelog/changelog.md) quando relevante ao usuário.
