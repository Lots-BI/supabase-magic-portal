---
title: CRM de audiência
description: Pessoas identificáveis por marca — comentários Instagram, jornada, retenção. Sem PII inventada.
status: living
owner: Engenharia Lots BI
tags: [crm, instagram, audiência]
difficulty: beginner
last_review: 2026-09-11
---

# CRM de audiência

Aba **CRM** em Dados (acima de Relatórios). Admin: `/admin/crm`. Cliente: `/cliente/{slug}/crm`.

Não é o pipeline comercial da agência (`agency_leads`). É a audiência da marca: quem comentou nos posts que o Hub já tem em `ig_media`.

## O que a tela mostra

- Cobertura: coletores live / scope faltando / planejado / impossível (curtidas).
- Gap: `comments` nas publicações vs sinais `comment`/`reply` no grafo.
- Tabs: **Todas** / **Responder agora** (intenção alta nas últimas 48 h) / **Em risco**.
- Ranking **O que traz gente de volta**: pessoas no CRM vs comentários da mídia (colunas distintas) e taxa de retorno 7/30/90 d.
- Export CSV só com fatos reais (e-mail/telefone vazios sem Lead Ads/WhatsApp).
- Ficha: identidades, fatos PII só com origem real, dono (admin), unir fichas (admin), timeline, Direct se houver IGSID.

## Coleta

Cron `instagram-crm-comments-sync` (depois do sync de mídia). Scope OAuth `instagram_manage_comments`. Token antigo não ganha permissão — **Refazer login**.

Webhook Meta: `GET|POST /api/webhooks/meta` (HMAC `META_APP_SECRET`, verify `META_WEBHOOK_VERIFY_TOKEN`). Direct / Lead Ads / WhatsApp entram quando o App Review e o objeto estiverem ligados. Ver [meta-crm-webhooks.md](../07-integrations/meta-crm-webhooks.md).

A Graph **não** entrega e-mail, telefone ou endereço de comentador, nem quem curtiu. Custom Audience só hasheia e-mail/telefone consentidos — nunca IGSID.

Plano das ondas seguintes: [crm-phase-2.md](./crm-phase-2.md).

## Tabelas

Migrations `61_crm_people_graph.sql` + `62_crm_inbox.sql`: `crm_people` (owner, merge), `crm_identities`, `crm_signals`, `crm_field_facts`, `crm_person_stats`, `crm_person_notes`, `crm_ingest_cursors`, `crm_collector_state`, `crm_webhook_receipts`, view `vw_crm_people_list`.
