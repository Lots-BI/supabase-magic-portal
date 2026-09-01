---
title: Publicações Instagram — Dashboard por post
description: Coleta e visualização de métricas por publicação via Platform Hub + Meta Graph API.
status: living
owner: Engenharia Lotus
last_review: 2026-09-01
---

# Publicações Instagram

Área exclusiva para métricas **por publicação** (Feed, Reels, Carrossel, Stories), separada do dashboard diário de perfil (`/cliente/:slug/instagram`).

## Rota

- Cliente: `/cliente/:slug/publicacoes`
- Menu lateral do cliente (quando Instagram está ativo)

## Coleta

- Plugin Hub: `instagram_organic`
- OAuth Meta com scopes `instagram_manage_insights`, etc.
- Sync manual: botão **Puxar métricas** (cooldown 5 min)
- Sync automático: cron diário **23:58** (America/Sao_Paulo) via Vercel — rota `GET /api/cron/instagram-media-sync` (requer `CRON_SECRET`)
- Admin: `/admin/conexoes` → sincronizar conexão Instagram

## Dados

- Tabelas: `ig_media`, `ig_media_metrics_history`
- View: `vw_ig_media_dashboard`
- Thumbnails: bucket `ig-media-thumbs`

## Gate B

```bash
npm run ig:gate-b
```

Requer `IG_GATE_B_ACCESS_TOKEN` ou `GATE_A_META_ACCESS_TOKEN` e conexão `instagram_organic` ativa.

## Setup Meta

Ver [meta-instagram-setup.md](../07-integrations/meta-instagram-setup.md).
