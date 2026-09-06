---
title: Setup Meta — Instagram orgânico (post metrics)
description: Passo a passo para configurar app Meta lots_bi e conectar Instagram no Platform Hub.
status: living
owner: Engenharia / Ops Lots BI
last_review: 2026-09-06
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
4. App Dashboard → Casos de uso / Permissions:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_read_engagement`
   - `pages_show_list`
   - `pages_manage_posts` (token da Página — necessário para publicar)
   - `business_management`
   - `instagram_content_publish` (Facebook Login — obrigatório para publicar; diferente de `instagram_business_content_publish`)
   - `ads_read` (papel da Página via Business Manager)
5. Business Verification da Lots
6. Modo **Live** (ou testers em Development)

## Publicar pelo Conteúdos

O Instagram **não agenda** nativamente. O Lots guarda `scheduled_publish_at` (horário de Brasília) e o job publica via Graph.

1. Adicione as permissões no App Dashboard **antes** de pedir no OAuth.
2. Em Conexões, **Refazer login** com a conta Meta da agência que gerencia o portfólio — token antigo não ganha escopo novo sozinho.
3. O app usa o **token da Página** (`GET /me/accounts`) ligada ao Instagram do cliente, não só o token do usuário.
4. `pages_manage_posts` libera o token da Página. Publicar no feed exige também `instagram_content_publish` no **mesmo** login. Token antigo não ganha permissão nova. Se o dialog quebrar com Invalid Scopes, o caso de uso ainda não está no app — use `META_REQUEST_IG_PUBLISH_SCOPE=0` só como escape.

## Lots BI

Variáveis: `META_APP_ID`, `META_APP_SECRET`, `APP_URL`, `HUB_CREDENTIAL_ENCRYPTION_KEY`

1. `/admin/conexoes/nova` → cliente → **Instagram** → Official API
2. OAuth → selecionar identidade **Instagram** (primária)
3. Sincronizar
4. Validar: `npm run ig:gate-b`

## Stories

Métricas de Story disponíveis por ~24h. Use sync diário + botão manual intraday.
