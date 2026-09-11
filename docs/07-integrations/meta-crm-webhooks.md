---
title: Webhooks Meta (CRM)
description: Callback HTTPS para comentários, Direct, menções e Lead Ads.
status: living
owner: Engenharia Lots BI
last_review: 2026-09-11
---

# Webhooks Meta — CRM

Endpoint único: `{APP_URL}/api/webhooks/meta`

- **GET** — desafio `hub.mode=subscribe` + `hub.verify_token` = `META_WEBHOOK_VERIFY_TOKEN`. Resposta: `hub.challenge` em texto puro.
- **POST** — header `X-Hub-Signature-256` HMAC SHA256 do raw body com `META_APP_SECRET`. Assinatura inválida → 401. Object desconhecido → 200 sem linhas de produto.

No App Dashboard (mesmo app do OAuth):

1. Callback URL pública HTTPS (produção) ou túnel em dev.
2. Verify token = valor de `META_WEBHOOK_VERIFY_TOKEN`.
3. Campos: `comments`, `mentions`, `messages` (Instagram); `leadgen` (Page). WhatsApp Cloud usa o mesmo HMAC se o app for o mesmo.

Direct e Lead Ads **não** pedem scope no OAuth até `META_REQUEST_IG_MESSAGES_SCOPE=1` e `META_REQUEST_LEADS_SCOPE=1` (App Review). Sem isso o chip permanece planejado e o comentário segue.

Idempotência: `crm_webhook_receipts` unique `(provider, external_id)`.
