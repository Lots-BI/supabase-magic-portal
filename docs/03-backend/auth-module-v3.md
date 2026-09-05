---
title: Auth Module v3
description: Registro oficial de conclusão da refatoração Auth + Access + Admin.
status: living
owner: Engenharia Lots BI
tags: [auth, delivery, v3]
last_review: 2026-07-01
---

# Auth Module v3

## Status

✅ **Concluído**

## Data

30 de junho de 2026

---

## Resumo da entrega

- Separação **Auth / Access / Admin** com fronteiras enforceadas (ESLint + script CI)
- Fluxos oficiais **Supabase Auth** (sem implementação paralela de sessão)
- **Convite** estabilizado — sem login automático após definir senha
- **Recovery** estabilizado — sessão temporária apenas para `updateUser`
- **Callback** simplificado em `/auth/callback`
- **Recovery Mode** com 3 ações operacionais (reenviar convite, redefinição de senha, excluir usuário)
- Arquitetura **desacoplada** — Auth zero Postgres da aplicação
- **Boundary validation** (`validate-auth-boundaries`) integrada ao `npm run check`
- Gate **fail-closed** em `assertAccessActive`
- Rotas Auth **thin adapters** com orchestrator injetado

---

## Escopo entregue

| Fase | Entrega                                                    |
| ---- | ---------------------------------------------------------- |
| 0    | ESLint boundaries, script de validação, docs, migration 15 |
| 1    | Redirects/bloqueios em `modules/access/services/*`         |
| 2    | Post-auth orchestrator; convite/recovery sem auto-login    |
| 3    | `modules/auth` definitivo; Minha Conta                     |
| 4    | Split `access.functions.server`; lifecycle 6 estados       |
| 5    | `modules/admin`; Recovery Mode 3 ações operacionais        |
| 6    | Cleanup, re-exports deprecated, docs finais                |

---

## Migrations obrigatórias (produção)

| Migration                                  | Propósito                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| `13_access_management.sql`                 | `access_accounts`, audit, lifecycle                                       |
| `14_access_lifecycle_fix.sql`              | Backfill lifecycle pós-migration 13                                       |
| `15_auth_invalidate_sessions.sql`          | RPC `access_invalidate_auth_sessions`                                     |
| `16_lifecycle_invite_expired_removal.sql`  | Dados `invite_expired` → `invite_pending`                                 |
| `17_fix_invalidate_sessions_uuid_cast.sql` | Corrige cast `varchar` vs `uuid` em `auth.refresh_tokens` (Recovery Mode) |

Ver [Migrations](../04-database/migrations.md).

---

## Validação de encerramento

| Gate                 | Resultado                                      |
| -------------------- | ---------------------------------------------- |
| `npm run check`      | ✅ Verde (validate + lint + 88 testes + build) |
| Lint                 | ✅                                             |
| Build                | ✅                                             |
| Arquivos temporários | ✅ Nenhum pendente                             |
| Git                  | ✅ Sincronizado com `origin/main`              |

---

## Known Operational Limitation — Recovery Mode (v3)

Durante a estabilização do Auth Module v3 foi identificado que o fluxo **Reenviar convite** para
usuários em status `invite_pending` pode não reenviar o e-mail em algumas situações, dependendo do
estado interno do Supabase Auth (OTP/Invite).

O módulo Auth, convites, login, logout, definição de senha e recuperação de senha estão funcionando
normalmente.

### Workaround oficial adotado pela equipe

1. Caso um usuário permaneça em `invite_pending` e o botão **Reenviar convite** não envie um novo
   e-mail, utilizar a ação **Excluir usuário** no Recovery Mode.
2. Após a exclusão, criar novamente o usuário pelo painel Administrativo.
3. O novo convite será enviado normalmente e o fluxo completo ocorrerá:

```
Admin cria usuário
        ↓
Usuário recebe convite
        ↓
Usuário define senha
        ↓
Conta ativa
```

Essa abordagem foi considerada aceitável para a versão atual da plataforma por ser simples,
previsível e operacionalmente segura.

**Registro operacional:**

- Não é necessário manipular diretamente usuários no Dashboard do Supabase.
- O painel administrativo da Lots BI já permite excluir usuários e recriá-los.
- Esse procedimento deve ser utilizado até que um futuro refinamento do Recovery Mode permita
  reenviar convites de maneira totalmente confiável.

### Evolução futura

Investigar o comportamento do Supabase Auth em relação aos convites já emitidos (`invite_pending`)
e avaliar uma estratégia mais robusta para reenvio sem necessidade de exclusão do usuário.

Essa melhoria é considerada uma **otimização operacional** e **NÃO bloqueia** o funcionamento do
sistema. Ver [Roadmap — Auth & Access](../11-roadmap/roadmap.md#auth--access--próximas-evoluções).

---

## Pendências conhecidas (fora desta versão)

- Refinamentos de UX nos fluxos auth (copy, loading states).
- Evoluções de **autorização e lifecycle** devem ocorrer no módulo **Access**, nunca no Auth.
- Migração completa `features/access` → `modules/access/domain`.
- Remoção de stubs deprecated em `features/auth` após período de compatibilidade.
- Valor `invite_expired` permanece no enum Postgres (app normaliza em runtime).
- Fail-open residual em `postAuthOnLoginSuccess` quando montagem de profile falha (hardening futuro).

Esses itens estão no [Roadmap](../11-roadmap/roadmap.md#auth--access--próximas-evoluções).

---

## Commits principais

Série `refactor(auth)` / `fix(auth)` em `main` (jun/2026), culminando em:

- `feat(auth): finalize auth module v3 architecture` — encerramento oficial e documentação

---

## Referências

- [Arquitetura Auth, Access e Admin](../02-architecture/auth-access-admin.md)
- [Autenticação & Autorização](./auth.md)
- [ADR-0014](../02-architecture/adr/0014-auth-module-v3-architecture.md)
- [Troubleshooting Auth](../08-operations/troubleshooting.md#auth-e-convites)
