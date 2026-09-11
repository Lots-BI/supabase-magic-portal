---
title: CRM de audiência
description: Caixa de entrada unificada da marca — interações + pessoas. Sem PII inventada.
status: living
owner: Engenharia Lots BI
tags: [crm, instagram, audiência, inbox]
difficulty: beginner
last_review: 2026-09-11
---

# CRM de audiência

Aba **CRM** em Dados (acima de Relatórios). Admin: `/admin/crm`. Cliente: `/cliente/{slug}/crm`.

Não é o pipeline comercial da agência (`agency_leads`). É a audiência da marca: cada pessoa que interagiu (WhatsApp, Direct, formulário, comentário, e-mail) numa ficha só.

## O que a tela mostra

- Home = **caixa de entrada**: último sinal inbound, ainda sem `brand_reply` da marca, no recorte de 7/30/90 dias.
- Tabs: **Caixa de entrada** / **Em risco** / **Todas**.
- Cobertura: coletores live / scope faltando / planejado / impossível (curtidas) + **API de ingestão**.
- Gap: `comments` nas publicações vs sinais `comment`/`reply` no grafo (só o canal Instagram).
- Ranking **O que traz gente de volta** (secundário): pessoas no CRM vs comentários da mídia.
- Export CSV só com fatos reais.
- Admin: gerar / copiar uma vez / revogar token da API de ingestão.
- Ficha: identidades, fatos PII só com origem real, dono (admin), unir fichas (admin), timeline.

## Coleta

1. **API** `POST /api/crm/v1/interactions` — ManyChat, n8n, Typeform, site. Ver [crm-ingest-api.md](../07-integrations/crm-ingest-api.md).
2. Cron `instagram-crm-comments-sync` + **Puxar comentários**. Scope OAuth `instagram_manage_comments`. Token antigo não ganha permissão — **Refazer login**.
3. Webhook Meta: `GET|POST /api/webhooks/meta` (HMAC `META_APP_SECRET`). Direct / Lead Ads / WhatsApp nativos entram quando o App Review estiver ligado. Ver [meta-crm-webhooks.md](../07-integrations/meta-crm-webhooks.md).

A Graph **não** entrega e-mail, telefone ou endereço de comentador, nem quem curtiu. Custom Audience só hasheia e-mail/telefone consentidos — nunca IGSID. O texto de um comentário ou DM **não** vira `field_facts`.

Plano das ondas nativas (App Review / WABA): [crm-phase-2.md](./crm-phase-2.md).

## Tabelas

Migrations `61_crm_people_graph.sql` + `62_crm_inbox.sql` + `63_crm_ingest_api.sql`: `crm_people` (owner, merge), `crm_identities`, `crm_signals`, `crm_field_facts`, `crm_person_stats`, `crm_person_notes`, `crm_ingest_cursors`, `crm_collector_state`, `crm_webhook_receipts`, `crm_ingest_tokens`, view `vw_crm_people_list`.
