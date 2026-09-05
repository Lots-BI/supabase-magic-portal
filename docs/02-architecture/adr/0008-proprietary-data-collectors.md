---
title: "ADR-0008: Coletores proprietários substituem Make"
status: proposed
date: 2026-06-26
deciders: Engenharia Lots BI / Arquitetura
---

# ADR-0008: Coletores proprietários substituem Make

## Contexto

Hoje a ingestão de métricas de marketing é feita por **cenários Make** externos ao
repositório. Isso permitiu validação rápida do produto, mas impõe:

- Ausência de versionamento e testes no mesmo ciclo do app.
- Observabilidade limitada.
- Dependência operacional de ferramenta terceira.
- Dificuldade de escalar para centenas de clientes e dezenas de plataformas.

A visão estratégica do Lots BI exige **coletores proprietários** por plataforma, com fila,
workers, retries, UPSERT e monitoramento.

## Decisão (alvo)

1. Implementar coletores Lots BI (`GoogleAdsCollector`, `MetaCollector`, etc.) como workers
   dedicados.
2. Orquestrar sync via fila de processamento (tecnologia TBD).
3. Migrar **plataforma a plataforma** — não big-bang.
4. Desligar cenários Make correspondentes após paridade validada.
5. Persistir apenas métricas oficiais (ver ADR-0007).

## Alternativas consideradas

| Alternativa                           | Por que não (longo prazo)                   |
| ------------------------------------- | ------------------------------------------- |
| Manter Make indefinidamente           | Sem controle, sem escala, bus factor        |
| Zapier/n8n/outro iPaaS                | Mesmos problemas de propriedade intelectual |
| ETL batch externo (Airbyte, Fivetran) | Custo, menos controle sobre regras Lots BI    |

Make permanece **aceitável no curto prazo** enquanto coletores não existem.

## Consequências

### Positivas

- Código de ingestão versionado, testável, observável.
- Alinhamento com arquitetura declarativa (1 coletor ↔ 1 PlatformDef).
- Base para SLA de sincronização por cliente.

### Negativas

- Investimento inicial significativo (auth OAuth, rate limits, backfill).
- Operação de fila/workers (infra adicional).
- Período de dual-run (Make + Lots BI) durante migração.

## Estado de implementação

| Item                                | Status                 |
| ----------------------------------- | ---------------------- |
| Coletores Lots BI                     | ❌ Não implementado    |
| Fila/workers                        | ❌ Não implementado    |
| Make operacional                    | ✅ (externo, inferido) |
| IDs técnicos em `cadastro_clientes` | ✅ Migration 05        |

## Referências

- [Pipeline Make (transitório)](../../07-integrations/current-pipeline-make.md)
- [Coletores alvo](../../07-integrations/target-collectors.md)
- [Arquitetura alvo](../target-architecture.md)
