---
title: Knowledge Center — documentação interna
description: Como navegar, buscar e manter a documentação técnica em /admin/knowledge.
---

# Knowledge Center (`/admin/knowledge`)

O **Knowledge Center** é a biblioteca técnica da plataforma — ADRs, arquitetura, APIs, migrations e runbooks. Tudo vem dos arquivos em `docs/` do repositório; **não há conteúdo duplicado no banco**.

## Para quem é

| Público                  | Use quando                                   |
| ------------------------ | -------------------------------------------- |
| Engenheiros e produto    | Entender decisões, contratos, schema, deploy |
| Administradores curiosos | Consultar glossário e visão de produto       |
| Clientes finais          | **Não** — use o **Tutorial** (`/tutorial`)   |

## Como acessar

1. Menu lateral → **Ajuda** → **Knowledge Center**
2. Rota: `/admin/knowledge`
3. Acesso: usuários com papel **admin**

## O que você encontra

- **Árvore por pastas** — `00-company`, `02-architecture`, `03-backend`, `06-dashboards`, etc.
- **Busca na home** — digite termos como “RLS”, “Content Workflow”, “ADR”
- **Busca global** (`Ctrl+K`) — também indexa documentos do KC
- **Favoritos e recentes** — salvos no seu navegador (localStorage)
- **Diagramas Mermaid** — renderizados na página
- **TOC automático** — índice à direita em telas grandes

## Knowledge Center vs Tutorial vs AI Workspace

| Recurso              | Rota                  | Conteúdo                        | Quem mantém                             |
| -------------------- | --------------------- | ------------------------------- | --------------------------------------- |
| **Tutorial**         | `/admin/tutorial`     | Passo a passo de uso (operação) | Produto / engenharia                    |
| **Knowledge Center** | `/admin/knowledge`    | Documentação completa           | Engenharia (docs/)                      |
| **Novidades**        | `/novidades`          | Entregas recentes (produto)     | Produto — `src/content/platform-news/`  |
| **AI Workspace**     | `/admin/ai-workspace` | Context Pack para IAs (síntese) | Automático — **somente Platform Owner** |

O KC é a **fonte única de verdade**. O AI Workspace **lê** o KC e sintetiza — nunca substitui.

## Passo a passo: encontrar uma ADR

1. Abra `/admin/knowledge`
2. Na árvore: **02-architecture** → **adr**
3. Clique na ADR desejada (ex.: Content Workflow v1)
4. Use o breadcrumb para voltar

## Passo a passo: buscar “aprovações”

1. Na home do KC, use a busca ou `Ctrl+K` no header
2. Resultados mostram título + trecho
3. Clique para abrir o documento

## Manutenção (engenharia)

Ao alterar o produto:

1. Edite ou crie `.md` em `docs/` com frontmatter (`title`, `description`, `last_review`)
2. Atualize o [Changelog](../../../docs/12-changelog/changelog.md) se a mudança for visível
3. Se for feature **client-facing**, adicione item em `src/content/platform-news/releases.ts` (`/novidades`)
4. Não é preciso registrar no app — novos arquivos `docs/` são indexados no build

## Próximo capítulo

Se você é **Platform Owner**, continue em **AI Workspace** para gerar contexto para IAs.
