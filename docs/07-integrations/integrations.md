---
title: Integrações & Pipeline de Ingestão
description: Catálogo de plataformas, IDs técnicos e o pipeline externo (Make/workers).
status: living
owner: Engenharia Lots BI
last_review: 2026-09-11
---

# Integrações & Pipeline de Ingestão

> **Três documentos:** ingestão **atual** [Hub](./current-pipeline-hub.md) · leftover
> [Make](./current-pipeline-make.md) · visão de fila [Coletores alvo](./target-collectors.md).

O Lots BI integra de forma **declarativa**: catálogo (`src/lib/integrations-catalog.ts`) +
IDs em `cadastro_clientes` + conexões Hub (`ph_connections`). Meta Ads e Instagram perfil
coletam via official_api. Make ainda alimenta Google/GA4.

---

## Catálogo de integrações

Fonte: `src/lib/integrations-catalog.ts`. Cada integração define a coluna que sinaliza
"ativa" (`activeField`) e os campos de ID técnico; o campo `primary` determina o status visual.

| Integração         | `activeField`           | Campos técnicos (coluna)                            |
| ------------------ | ----------------------- | --------------------------------------------------- |
| Google Ads         | `google_ads_ativo`      | `google_ads_customer_id` (primary)                  |
| Meta Ads           | `meta_ativo`            | `facebook_ad_account_id` (primary)                  |
| Instagram          | `instagram_ativo`       | `instagram_username`, `instagram_page_id` (primary) |
| Google Analytics 4 | `ga4_ativo`             | `ga4_property_id` (primary)                         |
| Google Business    | `google_business_ativo` | `google_business_location_id` (primary)             |
| TikTok Ads         | `tiktok_ativo`          | `tiktok_ad_account_id` (primary)                    |

### Status visual de uma integração

Calculado por `getIntegrationStatus(integration, values, active)`:

| Status       | Condição                                |
| ------------ | --------------------------------------- |
| `configured` | ativa **e** com ID principal preenchido |
| `partial`    | ativa, **sem** ID principal             |
| `pre`        | inativa, **mas** com ID já preenchido   |
| `off`        | inativa e sem ID                        |

Adicionar plataforma ao catálogo = **uma migration aditiva (`ADD COLUMN`)** + uma entrada em
`INTEGRATIONS`. (Para aparecer como dashboard, também precisa de view + `PlatformDef`.)

---

## Pipeline de ingestão

| Estado | Documento |
| ------ | --------- |
| **Atual (Hub + leftover)** | [current-pipeline-hub.md](./current-pipeline-hub.md) |
| **Make (legado)** | [current-pipeline-make.md](./current-pipeline-make.md) |
| **Alvo (fila/workers)** | [target-collectors.md](./target-collectors.md) |

```mermaid
sequenceDiagram
    autonumber
    participant API as API da plataforma
    participant Hub as Cron / Puxar
    participant Make as Make leftover
    participant H as base_metricas_hub
    participant M as base_metricas_make
    participant V as vw_* prefer_hub

    Hub->>API: Meta / Instagram (ontem BRT)
    Hub->>H: replace_hub_metric_days
    Make->>API: Google / GA4 (até OAuth)
    Make->>M: INSERT long
    H->>V: dia Hub ganha
    M->>V: só se Hub não tem o dia
```

### O que sabemos (confirmado pelo código)

- Os IDs técnicos que o Make consome moram em `cadastro_clientes` (migration
  `05_cadastro_clientes_make_ids.sql` foi criada exatamente para isso, "eliminando a
  dependência do Google Sheets como fonte de IDs").
- A saída Make é `base_metricas_make` em formato _long_. Hub usa `base_metricas_hub`.
- O Google Ads envia `spend` em **micros** (convertido na view).
- O nome do cliente vindo do Make pode divergir do cadastro (resolvido por
  [aliases](../02-architecture/adr/0004-chave-de-cliente-por-nome-e-aliases.md)).
- Algumas flags `*_ativo` são `text` justamente por compatibilidade com o Make.

### Lacunas a preencher (donos: Eng + Ops)

- Frequência/agendamento dos cenários (diário? horário?).
- Estratégia de _retry_ e tratamento de falha por plataforma.
- Janela de reprocessamento / _backfill_.
- Observabilidade: como sabemos que uma ingestão falhou? (hoje só dá para inferir por
  `vw_clientes_ativos.ultima_ingestao`).
- Contrato exato de nomes de `metrica` por plataforma.

> **Sinais de saúde disponíveis hoje:** `vw_clientes_ativos` (última data/ingestão por
> cliente), `/admin/debug` e `/admin/debug/views`. Ver [Runbook](../08-operations/runbook.md).

---

## Convenção: nomes de métrica esperados

As views esperam métricas com nomes específicos (em minúsculas após normalização). Resumo do
que cada view consome (fonte: definições em `08_aliases_e_null_guard.sql`):

| Plataforma      | Métricas esperadas                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Meta Ads        | reach, impressions, clicks, cpc, cpm, ctr, frequency, spend, results, conversions                                              |
| Google Ads      | impressions, clicks, spend                                                                                                     |
| GA4             | activeusers, sessions, engagedsessions, screenpageviews, eventcount, conversions                                               |
| Instagram       | reach, total_interactions, accounts_engaged, likes, comments, saves, shares, profile_links_taps                                |
| Google Business | profile_views, searches, direction_requests, website_clicks, phone_calls, messages, photo_views, reviews_count, reviews_rating |

> Se o Make mudar o nome de uma métrica, o número **somem silenciosamente** da view. Manter
> esta tabela sincronizada com os cenários é crítico.
