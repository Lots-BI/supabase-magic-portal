---
title: AI Chat Context
description: Contexto conversacional para modelos de chat — diferença vs Prompt Generator técnico.
status: living
owner: Engenharia Lots BI
last_review: 2026-07-06
---

# AI Chat Context

Contexto gerado automaticamente para **modelos conversacionais** (ChatGPT, Claude, Gemini, Perplexity).

## Diferença vs Prompt Generator

|               | Prompt Generator                       | AI Chat Context                        |
| ------------- | -------------------------------------- | -------------------------------------- |
| **Audiência** | Editores de código (Cursor, Copilot)   | Chats conversacionais                  |
| **Tom**       | Técnico, denso, referências a arquivos | Linguagem natural, narrativa           |
| **Foco**      | Estrutura, migrations, repos, stack    | Produto, filosofia, história, decisões |
| **Uso**       | Colar no início de sessão de coding    | Colar no início de chat novo           |
| **Gerador**   | `prompt-generator.ts`                  | `chat-context-generator.ts`            |

Ambos consomem as **mesmas fontes** (Knowledge Center, ADRs, roadmap, changelog, módulos) sem duplicar documentação.

## Estrutura (14 seções)

1. Produto — o que é, para quem, problema, visão
2. Filosofia — princípios de engenharia e arquitetura
3. História — timeline de ADRs e roadmap
4. Arquitetura — narrativa de como módulos se relacionam
5. Módulos — responsabilidade, pode/nunca, estado
6. Banco — Supabase, Postgres, RLS, repositories
7. Tecnologias — stack
8. Funcionalidades prontas — linguagem humana
9. Funcionalidades planejadas — roadmap
10. Regras de Ouro — fluxo UI → Repository → Supabase
11. Estado atual — maduro vs em evolução
12. Objetivo do momento — foco do roadmap
13. INSTRUÇÕES PARA A IA — como a IA deve trabalhar
14. Resumo executivo — compreensão em segundos

## Fontes automáticas

- `docs/` via Knowledge Center registry
- `configRegistry.listModules()` (OS Core)
- `06-dashboards/admin-modules.md` (superfícies de produto)
- ADRs, roadmap, changelog, philosophy, product-overview
- Snapshot existente do AI Workspace (`snapshot.ts`)

## Implementação

- Gerador: [`src/lib/ai-workspace/chat-context-generator.ts`](../src/lib/ai-workspace/chat-context-generator.ts)
- Enriquecimento: [`src/lib/ai-workspace/sources/chat-enrichment.ts`](../src/lib/ai-workspace/sources/chat-enrichment.ts)
- UI: botão **Gerar AI Chat Context** em `/admin/ai-workspace`
- Busca: indexado como seção `chat-context` no Fuse.js
