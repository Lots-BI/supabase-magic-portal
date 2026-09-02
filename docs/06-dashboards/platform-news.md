---
title: Novidades da plataforma
description: Como manter /novidades atualizado após cada deploy com feature visível ao cliente.
status: living
owner: Engenharia Lots BI
tags: [produto, clientes, changelog]
last_review: 2026-09-02
---

# Novidades da plataforma

Página **client-facing** em `/novidades` — linguagem de produto, não engenharia.

## Fonte de dados

Arquivo único: `src/content/platform-news/releases.ts`

Cada item:

| Campo | Obrigatório | Descrição |
| ----- | ----------- | --------- |
| `id` | sim | Slug estável (`YYYY-MM-DD-tema`) |
| `date` | sim | ISO `YYYY-MM-DD` |
| `title` | sim | Título curto |
| `summary` | sim | 1–2 frases |
| `bullets` | não | Lista do que o usuário pode fazer |
| `audience` | sim | `client` \| `admin` \| `all` |
| `tags` | não | Badges na UI |

Ordem: **mais recente primeiro** (topo do array).

## Quem vê o quê

| Visitante | Itens exibidos |
| --------- | -------------- |
| Cliente | `client` + `all` |
| Admin em `/novidades` | Todos (`client`, `admin`, `all`) |

## Checklist pós-deploy (feature visível)

1. Adicionar entrada em `releases.ts`.
2. Atualizar [Changelog](../12-changelog/changelog.md).
3. Capítulo do [Tutorial](../../src/content/platform-tutorial/) se fluxo novo (admin e/ou client).
4. Doc técnica em `docs/` se arquitetura/dados mudou (KC indexa no build).

## UI

Componente: `src/components/lotus/platform-news/PlatformNewsPage.tsx`  
Rota: `src/routes/_authenticated/novidades.tsx`  
Menu: sidebar cliente e admin (**Novidades**).

## Relação com Changelog

| Artefato | Público | Tom |
| -------- | ------- | --- |
| `/novidades` | Clientes (+ admins) | Produto, benefícios |
| `/admin/knowledge` → Changelog | Engenharia / ops | Técnico, PRs, migrations |

Não duplicar parágrafos longos — resuma em novidades, detalhe no changelog.
