---
title: Webhooks Meta (CRM)
description: Callback HTTPS para comentários, Direct, menções e Lead Ads.
status: living
owner: Engenharia Lots BI
last_review: 2026-11-13
---

# Webhooks Meta — CRM

Endpoint único: `{APP_URL}/api/webhooks/meta`

- **GET** — desafio `hub.mode=subscribe` + `hub.verify_token` = `META_WEBHOOK_VERIFY_TOKEN`. Resposta: `hub.challenge` em texto puro.
- **POST** — header `X-Hub-Signature-256` HMAC SHA256 do raw body com `META_APP_SECRET`. Assinatura inválida → 401. Object desconhecido → 200 sem linhas de produto.

No App Dashboard (mesmo app do OAuth):

1. Callback URL pública HTTPS (produção) ou túnel em dev.
2. Verify token = valor de `META_WEBHOOK_VERIFY_TOKEN`.
3. Campos: `comments`, `mentions`, `messages` (Instagram); `leadgen` (objeto **Page**). WhatsApp Cloud usa o mesmo HMAC se o app for o mesmo.

## Formulário instantâneo (Lead Ads)

O webhook `leadgen` só avisa o id. O Lots então lê o lead na Graph com o token da Página da conexão Meta Ads (fallback: Instagram da mesma Página):

`GET /{leadgen-id}?fields=created_time,field_data,campaign_name,ad_name,form_id,platform`

O resultado entra na aba **Formulários** do CRM, na mesma tabela `forms` da landing:

| | Landing | Formulário instantâneo |
| --- | --- | --- |
| `source` | `landing` | `meta_instant_form` |
| `form_key` | ex. `landing-lotsbi` | `meta-instant` |
| Tag na lista | a chave da landing | **Formulário instantâneo** |
| Campanha | UTMs da URL | nome da campanha / anúncio / formulário |

O filtro **Origem** separa os dois. E-mail, telefone e @ só entram se o campo do formulário for estruturado; pergunta livre fica na mensagem.

A Página precisa estar assinada em `leadgen`. O cron do CRM (`instagram-crm-comments-sync` / **Puxar Instagram**) assina a Página e puxa leads dos últimos 14 dias, para o caso de o webhook atrasar. Em produção (`VERCEL=1`) o mesmo cron inclui `leadgen` na assinatura Page do app se a callback já for `lotsbi.leandromajr.com`.

Permissão no token da Página: `leads_retrieval` (ler o lead), `pages_manage_ads` (listar os formulários) e `pages_manage_metadata` (assinar o webhook na Página). As três entram no OAuth quando `META_REQUEST_LEADS_SCOPE=1`. Sem elas o coletor `lead_ads` fica em falta de permissão e o envio não aparece na aba. Depois de ligar o flag, reconecte a conta em Conexões — o token antigo não ganha permissão nova. O flag também precisa estar na Vercel, senão o Relogin de produção não pede esses escopos.

Direct pede `META_REQUEST_IG_MESSAGES_SCOPE=1`. Formulário instantâneo pede `META_REQUEST_LEADS_SCOPE=1` e a permissão `leads_retrieval` já concedida no app. Sem o scope, o coletor `lead_ads` fica em falta de permissão; comentários seguem normais.

Enquanto o App Review de Direct não sair, o Lots puxa Direct pela Graph (`Puxar Instagram`) se `META_REQUEST_IG_MESSAGES_SCOPE=1`. A [API de ingestão](./crm-ingest-api.md) fica para formulário do site e eventos genéricos — não substitui o webhook `leadgen`.

Idempotência: `crm_webhook_receipts` unique `(provider, external_id)`.
