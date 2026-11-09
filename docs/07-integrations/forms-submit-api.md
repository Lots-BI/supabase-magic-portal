---
title: API de formulários (landing → CRM)
description: POST /api/forms/v1/submit — landings Cursor enviam leads sem chave Supabase.
status: living
owner: Engenharia Lots BI
tags: [crm, forms, landing, ingest]
difficulty: beginner
last_review: 2026-11-08
---

# API de formulários (landing → CRM)

`POST {APP_URL}/api/forms/v1/submit`

Autenticação: `Authorization: Bearer <token>`. O token é o **mesmo** gerado no CRM
(admin → cliente → **Formulário da landing → CRM**). O Lots guarda só o hash SHA-256;
o valor em claro aparece **uma vez**.

## Por que não usar a anon key do Supabase

- Espalhar `VITE_SUPABASE_ANON_KEY` em N landings de cliente é frágil e difícil de
  rotacionar.
- A tabela `forms` **não aceita INSERT anônimo**. Escrita só via esta API (service role
  no servidor Lots).
- Um token por cliente é revogável sem tocar no banco nem nas outras landings.

## Fluxo recomendado (Cursor)

```text
Browser (landing)
  → POST /api/lead          (rota server DA landing; guarda LOTS_FORMS_TOKEN)
  → POST lotsbi…/api/forms/v1/submit
  → CRM (pessoa + sinal form) + linha em public.forms
```

Env **só no server** da landing (sem `VITE_` / `NEXT_PUBLIC_`):

| Variável | Exemplo |
| --- | --- |
| `LOTS_FORMS_URL` | `https://lotsbi.leandromajr.com/api/forms/v1/submit` |
| `LOTS_FORMS_TOKEN` | `lots_crm_…` |

## Contrato

```json
{
  "nome": "Maria Silva",
  "email": "maria@email.com",
  "instagram": "mariasilva",
  "telefone": "5511999999999",
  "mensagem": "Quero saber mais",
  "form_key": "landing-lotsbi",
  "page_url": "https://site.com/?utm_source=meta&utm_campaign=teste",
  "utm_source": "meta",
  "utm_campaign": "teste",
  "external_id": "opcional-idempotente"
}
```

- `nome` obrigatório.
- Pelo menos um de `email` / `instagram` / `telefone`.
- `form_key` identifica a landing (vários forms do mesmo cliente).
- Sem `external_id`, cada envio gera um novo registro em `forms` (a pessoa no CRM
  ainda faz stitch por e-mail/@/fone).

Resposta: `{ ok, submissionId, personId, deduped }`.

## Separação por cliente

Uma tabela `forms` + coluna `cadastro_cliente_id` (não uma tabela por cliente).
O token resolve o cliente automaticamente. RLS: admin vê tudo; usuário do cliente só
o próprio escopo.

## Relação com a API genérica

Para eventos ricos (WhatsApp, batch, identities custom), use
[crm-ingest-api.md](./crm-ingest-api.md). Para landing de tráfego, use **esta** API.

## Migration

`92_forms_crm_submit.sql`.
