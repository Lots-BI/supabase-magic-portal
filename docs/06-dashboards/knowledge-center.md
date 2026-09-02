---
title: Knowledge Center — Módulo nativo
description: Arquitetura do Centro de Conhecimento integrado ao painel admin do Lots BI.
status: living
owner: Engenharia Lots BI
tags: [knowledge-center, admin, documentation]
difficulty: intermediate
last_review: 2026-09-02
---

# Knowledge Center

Módulo administrativo que renderiza `docs/**/*.md` como experiência de leitura estilo GitBook/Stripe Docs.

## Princípios

1. **Markdown é a fonte única** — arquivos em `docs/`; sem duplicação no banco.
2. **Auto-discovery** — `import.meta.glob` indexa novos `.md` no build (registry assíncrono; MDs não entram no bundle inicial).
3. **Modular** — parser, registry, navegação, busca e UI desacoplados em `src/lib/knowledge-center/`.
4. **Admin only** — rota `/admin/knowledge`, guard em `admin/route.tsx`.

## Estrutura de código

```
src/lib/knowledge-center/
  parse.ts          # frontmatter parser (browser-safe) + TOC
  registry.ts       # glob docs/**/*.md (lazy load por arquivo)
  navigation.ts     # árvore colapsável
  search.ts         # Fuse.js (carregado sob demanda)
  storage.ts        # favoritos e recentes (localStorage)
  link-resolver.ts  # links .md → rotas internas

src/components/knowledge-center/
  KnowledgeLayout   # shell + busca + drawer mobile do índice
  KnowledgeSidebar  # árvore (desktop fixa; mobile no Sheet)
  DocViewer, KnowledgeHome, …

src/routes/_authenticated/admin/knowledge/
  route.tsx, index.tsx, $.tsx (splat)
```

## Recursos

- Navegação por categorias (pastas `00-company`, …)
- **Mobile:** botão de índice (drawer) em telas &lt; `lg`; busca global continua disponível
- Busca instantânea na home do KC (dialog dedicado) + **GlobalSearch** no header (`Ctrl+K`)
- Breadcrumb, TOC automático, favoritos, recentes
- Mermaid renderizado sob demanda (não só bloco de código)
- Metadados YAML: `title`, `description`, `status`, `tags`, `difficulty`, `last_review`

## Performance (jun/2026)

- Registry e Fuse carregam **após** a primeira visita ao KC — reduz o bundle do shell autenticado.
- Diagramas Mermaid não bloqueiam o primeiro paint da página de doc.

## Responsividade (jun/2026)

O KC herda o `AppShell` (menu lateral em drawer no mobile). Dentro do módulo:

| Breakpoint | Comportamento                                                    |
| ---------- | ---------------------------------------------------------------- |
| &lt; `lg`  | Sidebar oculta; botão **menu** abre Sheet com `KnowledgeSidebar` |
| `lg+`      | Sidebar fixa à esquerda (260px) + conteúdo scrollável            |

Conteúdo markdown usa tipografia fluida e tabelas com `lotus-scroll-x` quando necessário.

## Relação com AI Workspace

O Knowledge Center é a **fonte única de verdade** (`docs/**/*.md`). O [AI Workspace](./ai-workspace.md)
consome o mesmo registry via `ensureRegistry()` para sintetizar Context Packs — sem duplicar conteúdo.
Tutorial em `/admin/tutorial` cobre uso operacional; KC cobre engenharia.

## Tutorial da plataforma

Guias passo a passo para admin e clientes vivem em `src/content/platform-tutorial/` e são
renderizados em `/admin/tutorial` e `/tutorial`. Atualize ambos (KC + tutorial) quando mudar
fluxos visíveis ao usuário.

| Público | Rota | Conteúdo |
| ------- | ---- | -------- |
| Admin | `/admin/tutorial` | Operação, conexões, clientes, KC |
| Cliente | `/tutorial` | Dashboards, aprovações, publicações IG |

Capítulos recentes (set/2026): admin `15-conexoes-instagram-publicacoes`; client `08-publicacoes-instagram`, `09-novidades-plataforma`.

## Novidades da plataforma (clientes)

Entregas visíveis ao usuário final também entram em `src/content/platform-news/releases.ts`
e aparecem em `/novidades`. **No mesmo PR do deploy:** changelog + tutorial (se aplicável) + item em `releases.ts`.

Ver [platform-news.md](./platform-news.md).

## Futuro (arquitetura preparada)

- Edição online, comentários, versionamento
- Busca semântica / IA
- Diff entre versões, docs por cliente, docs públicas

## Manutenção

Ao adicionar documentação:

1. Crie `.md` em `docs/` com frontmatter (`title`, `description`, `last_review`).
2. Atualize o [Changelog](../12-changelog/changelog.md) se a mudança for visível ao usuário ou operação.
3. Não é necessário registrar manualmente no app — o glob indexa no build.

Ver também [Padrões de documentação](../09-standards/documentation.md).
