---
title: Marco 4 — Publish Meta (Facebook Page)
description: Publicação live de foto aprovada na Facebook Page via Graph API (MVP).
status: living
owner: Engenharia Lots BI
tags: [content-workflow, marco-4, meta, publish]
difficulty: advanced
last_review: 2026-08-04
---

# Marco 4 — Publish Meta (MVP)

**Fecha:** card **Aprovado** → foto na **Facebook Page** → status `publicado` + `integration_metadata.meta_publish`.  
**Não fecha:** Instagram live, vídeo/Reels, agendamento Graph, carrossel, TikTok/LinkedIn.

> Scheduler de **métricas** = Marco 2. Agendamento de **posts** (cron de `data_publicacao`) = futuro; este MVP publica **agora**.

---

## Pré-requisitos

1. Conexão Hub Meta (`official_api`) do **mesmo** `cadastro_cliente_id` do card
2. Identity **Page** anexada na conexão
3. OAuth reconectado (Connect scopes). Para **publish live**:
   - Habilite no App Dashboard Use Case **Manage everything on your Page** com `pages_show_list` + `pages_manage_posts`
   - Na UI da conexão Meta: **Reconectar + Publish** (não use o Connect padrão — ele só pede métricas)
   - Alternativa ops: `META_OAUTH_INCLUDE_PUBLISH_SCOPES=1` no `.env` e reconnect normal
   - **Não** deixe publish no dialog padrão permanente — apps sem Use Case quebram com "Invalid Scopes"
4. Card com plataforma **Facebook**, status **Aprovado**, e **imagem** (anexo ou `capa_url`)
5. Meta App com permissões de Page (dev/test users ou App Review)

**Importante:** o dialog padrão de Conexões usa só scopes de **métricas** (`ads_read`, `business_management`, `pages_read_engagement`, `instagram_basic`). Publish scopes ficam em `META_OAUTH_PUBLISH_SCOPES` até o app Meta estar pronto. Checklist humano: [manual-ops-checklist](./manual-ops-checklist.md).

---

## Como usar (ops)

1. Aprovar o conteúdo no Kanban (`aprovado`)
2. Abrir o card → **Publicar no Facebook**
3. Sucesso: status `publicado` + botão **Ver no Facebook** (quando a Graph retorna `post_id`)

Marcar **Publicado** só no Kanban continua sendo **local** (sem Graph) — útil para Instagram até o MVP+1.

---

## Código

| Peça | Path |
|------|------|
| Graph helpers | `src/modules/approval/integrations/meta/meta-page-graph.ts` |
| Helpers de domínio | `…/meta-publish-helpers.ts` |
| Orquestração | `src/modules/approval/internal/publish-meta.server.ts` |
| Server fn | `publishCardToMeta` em `cards.server.ts` |
| UI | `CardDetailDrawer` — botão Publish |
| Scopes | `meta-oauth.config.ts` + `meta_ads.manifest.json` (connect default; publish separado) |

Fluxo: vault user token → `me/accounts` (Page token) → multipart `/{page-id}/photos` → metadata + move `publicado`.

---

## Limitações conhecidas

- Instagram: mensagem na UI; Graph IG container/publish fica para MVP+1
- App Review Meta pode bloquear publish fora de test users
- Sem Page identity ou OAuth antigo → erro acionável pedindo reconnect
- Agendamento automático por data/hora **não** está neste marco

---

## Verificação rápida

```bash
npm test -- src/modules/approval/integrations/meta
```

Manual: card Facebook aprovado + imagem + Page no Hub → Publish → post na Page.
