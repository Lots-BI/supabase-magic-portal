---
title: Segurança
description: Modelo de defesa em profundidade, segredos, RLS e políticas de acesso.
status: living
owner: Engenharia Lots BI
last_review: 2026-10-21
---

# Segurança

Varredura de isolamento multi-tenant (somente leitura, protocolo):
[Plano de varredura de segurança](../reports/security-scan-plan.md).

---

## Princípio: defesa em profundidade

O Lots BI **não confia apenas na UI**. Cada camada valida independentemente:

```mermaid
flowchart TB
    UI["UI — esconde botões por papel"]
    Route["Route guards — redirect"]
    SF["Server functions — Zod + assertAdmin"]
    RLS["Postgres RLS — filtro por tenant"]
    Views["Views — current_user_clientes()"]

    UI --> Route --> SF --> RLS
    RLS --> Views
```

---

## Segredos e variáveis

| Variável                          | Exposição       | Risco se vazar                 |
| --------------------------------- | --------------- | ------------------------------ |
| `VITE_OFFICIAL_SUPABASE_ANON_KEY` | Bundle browser  | Baixo (RLS protege)            |
| `OFFICIAL_SUPABASE_ANON_KEY`      | Servidor        | Baixo                          |
| `OFFICIAL_SERVICE_ROLE_KEY`       | **Só servidor** | **Crítico** — bypass total RLS |

Regras:

- Service-role **nunca** com prefixo `VITE_`
- Arquivos `*.server.ts` não importáveis no client
- `.env` no `.gitignore`; template em `.env.example`

Ver [Deployment](../08-operations/deployment.md).

---

## Validação de entrada

Toda server function que recebe payload:

1. `requireSupabaseAuth`
2. Validação **Zod** do body
3. `assertAdmin` quando operação administrativa

Exemplo: `createCliente`, `updateCliente`, `createUserAccount`.

---

## RLS (Row Level Security)

Todas as tabelas de domínio têm RLS habilitada. Policies documentadas em
[RLS Policies](../04-database/rls-policies.md).

### Views analíticas: `security_invoker`

Desde a migration **51**, views `vw_*` críticas rodam como o JWT (`security_invoker`).
Isolação = RLS de `base_metricas_make` / `base_metricas_hub` + `current_user_clientes()`.

A migration 07 (DEFINER) e o [ADR-0003](../02-architecture/adr/0003-views-security-definer.md)
descrevem o workaround antigo. Sem policy SELECT no Make, o invoker devolvia overview
vazio — corrigido na **54**.

---

## Soft delete

Clientes não são apagados fisicamente — `ativo = false` via `deactivateCliente`.
Preserva histórico analítico e integridade referencial.

Posts editorial: `deletePost` faz DELETE físico (exceção documentada).

---

## Signup público

Conta nasce em `/criar-conta` (service role). O pedido em `/solicitar-acesso`
não cria organização até a Lots aprovar. Há limite de taxa e senha de 10
caracteres. `access_invalidate_auth_sessions` só executa como `service_role`.
Cofre: `HUB_CREDENTIAL_ENCRYPTION_KEY` obrigatória. Checkout e NFS-e ficam
fora desta superfície (`fin_*`).

---

## Checklist de segurança para PRs

- [ ] Nova tabela tem RLS + policies?
- [ ] Nova server function usa `requireSupabaseAuth` + Zod?
- [ ] Operação admin usa `assertAdmin`?
- [ ] Service-role só em `.server.ts`?
- [ ] Nenhum segredo em `VITE_*`?
- [ ] Dados sensíveis filtrados por `current_user_clientes()`?

---

## Referências

- [Plano de varredura de segurança](../reports/security-scan-plan.md)
- [Autenticação](./auth.md)
- [ADR-0005](../02-architecture/adr/0005-server-functions-anon-vs-service-role.md)
- [ADR-0003](../02-architecture/adr/0003-views-security-definer.md)
