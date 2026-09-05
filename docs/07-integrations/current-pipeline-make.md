---
title: Pipeline Make (Transitório)
description: Ingestão atual via Make — estado observado, limitações e plano de substituição.
status: living
owner: Engenharia / Ops Lotus
last_review: 2026-06-26
---

# Pipeline Make (Transitório)

> **⚠️ TRANSITÓRIO:** Make é a solução **atual** de coleta de dados. Faz parte da validação
> inicial do produto, **não** da arquitetura definitiva. Plano: substituir por
> [Coletores proprietários](./target-collectors.md).

---

## Fluxo atual

```mermaid
sequenceDiagram
    participant API as APIs Oficiais
    participant Make as Make (externo)
    participant CC as cadastro_clientes
    participant BM as base_metricas
    participant Views as vw_* (Supabase)

    Make->>CC: Lê IDs técnicos por cliente
    Make->>API: Consulta métricas (OAuth/contas vinculadas)
    API-->>Make: Métricas oficiais
    Make->>BM: INSERT/UPDATE (long format)
    BM->>Views: Agregação SQL
```

---

## O que sabemos (observado / inferido)

| Fato                                      | Fonte                                         |
| ----------------------------------------- | --------------------------------------------- |
| Make grava em `base_metricas`             | Análise de views + docs de integrações        |
| IDs técnicos em `cadastro_clientes`       | Migration 05 (`google_ads_customer_id`, etc.) |
| Spend Google Ads chega em micros          | Views convertem `/ 1_000_000`                 |
| Chave de cliente por **nome** (+ aliases) | Migration 08, ADR-0004                        |
| Make **não está versionado** neste repo   | Ausência de cenários/config                   |

---

## O que NÃO sabemos

> ⚠️ INFORMAÇÃO NÃO ENCONTRADA no repositório:

- Cenários Make (quantidade, estrutura, módulos).
- Frequência de sincronização por plataforma/cliente.
- Política de retries e tratamento de rate limit.
- Contrato exato de nomes de métricas gravadas por plataforma.
- Monitoramento e alertas operacionais.
- Onde credenciais OAuth são armazenadas (Make vault?).

**Recomendação:** documentar cenários Make externamente (Notion/runbook ops) até migrar
para coletores Lotus; ou exportar definição como artefato versionado.

---

## Riscos do estado atual

| Risco                          | Impacto                                           |
| ------------------------------ | ------------------------------------------------- |
| Sem versionamento              | Mudança no Make quebra dashboards silenciosamente |
| Sem observabilidade            | Falhas de sync descobertas tarde                  |
| Chave por nome                 | Duplicatas, aliases, dados órfãos                 |
| Métricas derivadas no SQL      | Divergência com engine TS                         |
| Dependência de pessoa/processo | Bus factor alto                                   |

---

## Critérios para desligar Make (por plataforma)

Substituir Make quando **todos** forem verdadeiros para aquela plataforma:

- [ ] Coletor Lotus implementado e testado
- [ ] Paridade de dados validada (amostragem ≥ 7 dias)
- [ ] Scheduler + retries + alertas operacionais
- [ ] UPSERT idempotente com `cliente_id` FK
- [ ] Runbook de reprocessamento documentado
- [ ] Make desligado para aquela plataforma (não big-bang global)

### Instagram (perfil/conta) — status

- [x] Coletor Lotus implementado — plugin `instagram_organic`, capability
      `instagram_organic:profile:collect` (Graph API, `metrics-timeseries` → `base_metricas_hub`).
      Ver [instagram.md](../06-dashboards/platforms/instagram.md).
- [x] Dashboard já prefere Hub por dia+cliente sem cutover global — migration
      `34_instagram_profile_prefer_hub.sql`.
- [ ] Paridade de dados validada (amostragem ≥ 7 dias, Gate B) — pendente.
- [ ] Scheduler automático (cron) — hoje só manual via botão **Puxar métricas**; reaproveitar
      workflow pendente de `/publicacoes` (`.github/workflows/instagram-media-sync-cron.yml`).
- [ ] Runbook de reprocessamento — cobrir "backfill parcial" (cap de 30 dias/clique).
- [ ] Make desligado para Instagram — **ainda não**; dual-run intencional nesta fase.

---

## Relacionamento com cadastro de clientes

Make depende de campos técnicos em `cadastro_clientes`:

- `google_ads_customer_id`
- `meta_ad_account_id`
- `instagram_business_account_id`
- `ga4_property_id`
- (outros conforme migration 05)

Admin atualiza via painel → Make lê na próxima execução.

---

## Próximos passos

1. Versionar schema de `base_metricas` (migration).
2. Piloto: `GoogleAdsCollector` substituindo cenário Make do Google Ads.
3. Ver [Arquitetura alvo](../02-architecture/target-architecture.md).
