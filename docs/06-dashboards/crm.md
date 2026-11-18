---
title: CRM de audiência
description: Caixa de entrada unificada da marca — interações + pessoas. Sem PII inventada.
status: living
owner: Engenharia Lots BI
tags: [crm, instagram, audiência, inbox]
difficulty: beginner
last_review: 2026-11-18
---

# CRM de audiência

Aba **CRM** em Dados (acima de Relatórios). Admin: `/admin/crm`. Cliente: `/cliente/{slug}/crm`.

O recorte completo de leads (landing + formulário instantâneo da Meta), com KPIs e filtros
dedicados, vive na **Central de Leads** — ver seção dedicada abaixo. A aba **Formulários**
aqui no CRM continua existindo, compacta, para ver o lead ao lado da trajetória de
comentários/Direct da mesma pessoa.

Não é o pipeline comercial da agência (`agency_leads`). É a audiência da marca: cada pessoa que interagiu (WhatsApp, Direct, formulário, comentário, e-mail) numa ficha só.

## O que a tela mostra

- Home = **caixa de entrada**: último sinal inbound, ainda sem `brand_reply` da marca, no recorte de 7/30/90 dias.
- Tabs principais: **Comentários** / **Pessoas** / **Formulários**.
- Em Pessoas: **Caixa de entrada** / **Em risco** / **Todas**.
- **Formulários:** lista compacta dos envios em `forms`. A tag mostra a origem: a chave da landing (`landing-lotsbi`) ou **Formulário instantâneo** (campanha da Meta). Filtro **Origem**. Detalhe em sheet; atalho para a ficha CRM quando houver `crm_person_id`. Botão **Abrir Central de Leads** leva para o recorte completo (KPIs, mais filtros).
- Cobertura: coletores live / scope faltando / planejado / impossível (curtidas) + **API de ingestão**.
- Gap: `comments` nas publicações vs sinais `comment`/`reply` no grafo (só o canal Instagram).
- Ranking **O que traz gente de volta** (secundário): pessoas no CRM vs comentários da mídia.
- Export CSV só com fatos reais.
- Admin: gerar / copiar uma vez / revogar token da API de ingestão / prompt Cursor da landing.
- Ficha: identidades, fatos PII só com origem real, dono (admin), unir fichas (admin), timeline.

## Central de Leads

Tela dedicada em Dados: `/admin/leads` (portfólio por cliente) e `/cliente/{slug}/leads`
(detalhe). Mesma fonte de dados da aba Formulários (`listCrmFormSubmissionsFn` sobre a
tabela `forms`) — não existe ingestão paralela nem regra de origem duplicada; a lógica de
classificação vive só em
[`src/modules/crm/ingest/meta-instant-form.ts`](../../src/modules/crm/ingest/meta-instant-form.ts).

- **Hub admin** (`/admin/leads`): uma linha por cliente ativo — Envios / Landing /
  Instantâneo no período (7/30/90), via `listLeadsPortfolioFn`. Clique abre o cliente.
- **Detalhe** (`LeadCentralWorkspace`): KPIs (envios, landing, instantâneo, com contato),
  busca, filtro de origem e de formulário, lista de leads e sheet de detalhe (contato
  copiável, campanha/UTMs da Meta, link **Abrir ficha no CRM**).
- **Abrir ficha no CRM** leva para `/cliente/{slug}/crm?pessoa={id}`, que abre a ficha
  direto — a trajetória completa (comentários, Direct, notas) continua só no CRM, por
  desenho: a Central de Leads é o recorte de aquisição, o CRM é o relacionamento contínuo.
- A aba **Formulários** do CRM não foi removida: ela fica para ver o lead ao lado da
  pessoa, sem trocar de tela. A Central de Leads é o lugar de referência para o volume e
  a performance de leads por cliente.

## Coleta

1. **Graph Instagram no Lots** — comentários (já no OAuth) e Direct (caso de uso Mensagens no App Dashboard + `META_REQUEST_IG_MESSAGES_SCOPE=1` + Relogin). Sem ManyChat e sem n8n.
2. Cron `instagram-crm-comments-sync` (comentários + Direct) depois do sync de mídia. Botão **Puxar Instagram**.
3. Webhook Meta: `GET|POST /api/webhooks/meta`. O campo `leadgen` (formulário instantâneo de campanha) busca o lead na Graph e grava a aba **Formulários** com origem `meta_instant_form` / `form_key=meta-instant`. Ver [meta-crm-webhooks.md](../07-integrations/meta-crm-webhooks.md).
4. **Formulário de landing** `POST /api/forms/v1/submit` — payload simples (`nome`/`email`/`instagram`…); token por cliente; **sem** chave Supabase na landing. Ver [forms-submit-api.md](../07-integrations/forms-submit-api.md).
5. **Opcional** `POST /api/crm/v1/interactions` — eventos genéricos (n8n, batch). Ver [crm-ingest-api.md](../07-integrations/crm-ingest-api.md).

A Graph **não** entrega e-mail, telefone ou endereço de comentador, nem quem curtiu. Custom Audience só hasheia e-mail/telefone consentidos — nunca IGSID. O texto de um comentário ou DM **não** vira `field_facts`.

Plano das ondas nativas (App Review / WABA): [crm-phase-2.md](./crm-phase-2.md).

## Tabelas

Migrations `61_crm_people_graph.sql` + `62_crm_inbox.sql` + `63_crm_ingest_api.sql`: `crm_people` (owner, merge), `crm_identities`, `crm_signals`, `crm_field_facts`, `crm_person_stats`, `crm_person_notes`, `crm_ingest_cursors`, `crm_collector_state`, `crm_webhook_receipts`, `crm_ingest_tokens`, view `vw_crm_people_list`.
