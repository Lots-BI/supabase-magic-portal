---
title: API de ingestão CRM
description: POST /api/crm/v1/interactions — ManyChat, n8n, Typeform ou o site enviam a mesma ficha de pessoa.
status: living
owner: Engenharia Lots BI
tags: [crm, ingest, manychat, n8n]
difficulty: beginner
last_review: 2026-09-11
---

# API de ingestão CRM

`POST {APP_URL}/api/crm/v1/interactions`

Autenticação: `Authorization: Bearer <token>`. O token é gerado na aba CRM (admin), por marca. O Lots guarda só o hash SHA-256; o valor em claro aparece **uma vez**.

Vite local responde 404 em `/api/*` (Nitro só no deploy Vercel). Teste o endpoint em produção ou com `npm run preview` / função Nitro.

## Contrato

Um evento ou `{ "events": [ ... ] }` (máx. 50). Cada evento precisa de `channel`, `external_id` estável e pelo menos uma identidade conhecida.

```json
{
  "occurred_at": "2026-09-11T12:00:00.000Z",
  "channel": "whatsapp",
  "external_id": "wamid.HBgN...",
  "body": "quero orçamento",
  "identities": [{ "kind": "whatsapp", "value": "5511999999999" }],
  "facts": [{ "field": "phone", "value": "5511999999999" }],
  "display_name": "Ana",
  "campaign_key": "optional",
  "direction": "inbound"
}
```

Canais: `whatsapp`, `instagram_dm`, `instagram_comment`, `messenger`, `lead_form`, `form`, `email`, `call`, `review`, `mention`, `other`.

Identidades: `igsid`, `ig_username`, `email`, `phone`, `whatsapp`, `messenger_psid`, `leadgen`, `gbp_reviewer`, `yt_channel`.

Fatos (`facts[]`): só `email`, `phone`, `address`, `full_name`. **Nunca** extraímos PII do `body`.

`direction: "outbound"` grava `brand_reply` (a pessoa sai da caixa de entrada).

Idempotência: unique `(cadastro, source, external_id)` com `source = ingest_api:{channel}`.

Resposta: `{ ok, ingested, errors: [{ externalId, error }] }`. 401 se o token faltar ou estiver revogado.

## Exemplo curl

```bash
curl -X POST https://lotsbi.leandromajr.com/api/crm/v1/interactions \
  -H "Authorization: Bearer lots_crm_..." \
  -H "Content-Type: application/json" \
  -d '{"channel":"form","external_id":"tf-1","identities":[{"kind":"email","value":"ana@marca.com"}],"facts":[{"field":"email","value":"ana@marca.com"},{"field":"full_name","value":"Ana"}]}'
```

Coletores nativos (comentários Graph, Direct, Lead Ads, WhatsApp Cloud) escrevem o **mesmo** grafo. Esta API existe para não esperar App Review.
