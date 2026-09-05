---
title: "ADR-0014: Auth Module v3 — Separação Auth, Access e Admin"
status: accepted
date: 2026-06-30
deciders: Engenharia Lots BI
---

# ADR-0014: Auth Module v3 — Separação Auth, Access e Admin

## Contexto

O portal Lots BI acumulou lógica de autenticação, lifecycle, permissões e gestão de usuários
em rotas monolíticas e server functions compartilhadas. Isso gerava:

- Login decidindo admin, lifecycle e destino no mesmo arquivo
- Convite e recovery com login automático imprevisível
- Dificuldade de evoluir Auth sem tocar regras de negócio
- Acoplamento entre telas Auth e Postgres da aplicação

## Decisão

Adotar **Auth Module v3** com três módulos e um orchestrator:

1. **`modules/auth`** — apenas sessão Supabase (login, logout, callback, set-password UI).
   Proibido importar Access, Admin ou Postgres da aplicação.

2. **`modules/access`** — lifecycle (`access_accounts`), bloqueios, destino pós-login,
   gate autenticado, Recovery Mode server-side, audit.

3. **`modules/admin`** — gestão de usuários (convites, create/delete, Recovery Mode UI).

4. **Orchestrator** (`post-auth-orchestrator.server.ts`) — única ponte permitida entre
   rotas Auth e Access.

5. **Princípios de fluxo:**
   - Convite e recovery **nunca** fazem login automático após `updateUser`.
   - Sessão JWT válida ≠ usuário ativo (`assertAccessActive`).

6. **Enforcement:** ESLint por glob + `validate-auth-boundaries.mjs` no CI local (`npm run check`).

## Alternativas consideradas

| Alternativa                                  | Por que não                          |
| -------------------------------------------- | ------------------------------------ |
| Manter rota `/auth` monolítica               | Regressão de acoplamento garantida   |
| Auth consultar `access_accounts` diretamente | Viola fronteira Supabase × Lots BI   |
| Middleware global único para tudo            | Opaco; dificulta testes e manutenção |
| Login automático pós-convite                 | UX inconsistente; bypass de gate     |

## Consequências

### Positivas

- Fronteiras claras para evolução (MFA/OAuth futuros ficam em Auth; lifecycle em Access).
- Fluxos convite/recovery previsíveis e alinhados a práticas modernas.
- Testes unitários de redirect, callback e lifecycle isolados.
- Documentação e ADR rastreáveis.

### Negativas / dívidas

- Dupla fonte de onboarding: `user_metadata.lots_bi` + `access_accounts.lifecycle_status`.
- `features/access` ainda coexiste com `modules/access` (migração incompleta).
- Access importa Admin dinamicamente para reenvio de convite (ciclo de módulos).
- Enum Postgres ainda inclui `invite_expired` (normalizado em runtime).
- Stubs deprecated em `features/auth` mantidos por compatibilidade.

## Referências

- [Arquitetura Auth, Access e Admin](../auth-access-admin.md)
- [Auth Module v3 — entrega](../../03-backend/auth-module-v3.md)
- [Autenticação & Autorização](../../03-backend/auth.md)
