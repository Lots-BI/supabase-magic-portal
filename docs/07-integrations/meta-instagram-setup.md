---
title: Setup Meta — Instagram orgânico (post metrics)
description: Passo a passo para configurar app Meta lots_bi e conectar Instagram no Platform Hub.
status: living
owner: Engenharia / Ops Lotus
last_review: 2026-09-01
---

# Setup Meta — Instagram orgânico

## Pré-requisitos por conta

1. Instagram **Business ou Creator**
2. Vinculada a uma **Facebook Page**
3. Usuário OAuth é **admin** da Page no Business Manager

## App Meta (lots_bi)

1. [Meta for Developers](https://developers.facebook.com/) → app existente
2. Produtos: **Facebook Login** + **Instagram Platform**
3. Redirect URI: `{APP_URL}/oauth/meta/callback`
4. App Review → Advanced Access:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_read_engagement`
   - `pages_show_list`
   - `business_management`
5. Business Verification da Lots
6. Modo **Live** (ou testers em Development)

## Lotus

Variáveis: `META_APP_ID`, `META_APP_SECRET`, `APP_URL`, `HUB_CREDENTIAL_ENCRYPTION_KEY`

1. `/admin/conexoes/nova` → cliente → **Instagram** → Official API
2. OAuth → selecionar identidade **Instagram** (primária)
3. Sincronizar
4. Validar: `npm run ig:gate-b`

## Stories

Métricas de Story disponíveis por ~24h. Use sync diário + botão manual intraday.
