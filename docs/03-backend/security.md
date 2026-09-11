---
title: Segurança
description: Modelo de defesa em profundidade, segredos, RLS e políticas de acesso.
status: living
owner: Engenharia Lots BI
last_review: 2026-06-26
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

### Exceção: views `SECURITY DEFINER`

Views analíticas rodam como owner do banco (migration 07), contornando RLS em
`base_metricas`. Isolamento mantido via `WHERE current_user_clientes()` na view.

**Dívida:** reavaliar quando policy correta existir em `base_metricas`.
Ver [ADR-0003](../02-architecture/adr/0003-views-security-definer.md).

---

## Soft delete

Clientes não são apagados fisicamente — `ativo = false` via `deactivateCliente`.
Preserva histórico analítico e integridade referencial.

Posts editorial: `deletePost` faz DELETE físico (exceção documentada).

---

## Signup público

**Risco atual:** qualquer pessoa pode criar conta em `/auth`.

**Mitigação planejada:** desabilitar signup; fluxo invite-only via admin.
Ver [roadmap](../11-roadmap/roadmap.md) Fase 2.

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
