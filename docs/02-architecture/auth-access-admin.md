---
title: Arquitetura Auth, Access e Admin
description: Fronteiras dos módulos de autenticação, autorização e gestão de usuários (Auth Module v3).
status: living
owner: Engenharia Lots BI
tags: [auth, access, admin, architecture]
last_review: 2026-07-01
---

# Arquitetura Auth, Access e Admin

Documento de referência da **Auth Module v3** — concluída em 30/06/2026.
Entrega registrada em [Auth Module v3](../03-backend/auth-module-v3.md).

---

## Princípio fundamental

```
Auth   → autentica (estabelece / encerra sessão)
Access → autoriza (lifecycle, permissões, bloqueios, destinos)
Admin  → gerencia usuários (dispara operações; orquestra Auth + Access)
Cliente → domínio de empresas, dados e dashboards (Auth nunca conhece)
```

**Auth responde apenas:** _"Existe uma sessão autenticada válida?"_

**Access responde:** _"Este usuário pode usar a plataforma e para onde vai?"_

---

## Auth

### Responsável por

| Área                       | Detalhe                                                     |
| -------------------------- | ----------------------------------------------------------- |
| Login                      | `signInWithPassword` em `/auth`                             |
| Logout                     | `signOut` via `useSignOut`                                  |
| Sessão                     | JWT no browser; `onAuthStateChange`                         |
| Callback                   | `/auth/callback` — `verifyOtp`, `exchangeCodeForSession`    |
| Convite (UI)               | Link → callback → `set-password` → `updateUser` → `signOut` |
| Recuperação (UI)           | `resetPasswordForEmail` → callback → nova senha → `signOut` |
| Alteração da própria senha | `/account/security` — reauth + `updateUser`                 |

### Não conhece

- Clientes
- Permissões e papéis de negócio
- Dashboards
- Regras de negócio
- Lifecycle (`access_accounts`)
- Módulo Access (imports proibidos em `src/modules/auth/**`)

### Código

```
src/modules/auth/
├── callback/          # parse, verify, exchange, redirect pós-callback
├── components/        # AuthShell, bootstrapping
├── hooks/             # useSignOut
├── pages/             # AuthPage, ChangePasswordForm
├── views/             # auth-views (login, set-password, …)
└── validation/        # password

src/routes/auth/
├── index.tsx          # thin adapter + orchestrator
└── callback.tsx       # thin adapter + orchestrator
```

---

## Access

### Responsável por

| Área                   | Detalhe                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Lifecycle              | 6 estados: `invite_pending` → `awaiting_password` → `active` → `disabled` / `revoked` |
| Permissões             | Composição com `user_roles`, `client_access`, RLS                                     |
| Papéis                 | Resolução admin vs cliente (`resolveUserIsAdmin`)                                     |
| Bloqueios              | `resolveBlockedRedirect`, `assertAccessActive`                                        |
| Destino pós-login      | `resolvePostAuthDestination` → `/admin` ou `/dashboard`                               |
| Autorização            | Gate no login e no layout autenticado                                                 |
| Recovery Mode (server) | `performAccessRecovery` — lifecycle + audit + ban/sessões                             |
| Orchestrator           | Ponte oficial Auth → Access                                                           |

### Orchestrator (Regra de Ouro)

Arquivo: `src/modules/access/post-auth-orchestrator.server.ts`

| Função                            | Quando                              |
| --------------------------------- | ----------------------------------- |
| `postAuthOnLoginSuccess`          | Após login — gate + destino         |
| `postAuthOnInvitePasswordSet`     | Após senha inicial do convite       |
| `postAuthOnRecoveryCompleted`     | Após senha via recovery             |
| `postAuthOnPasswordChangedByUser` | Após alteração em Minha Conta       |
| `postAuthOnCallbackCompleted`     | Audit `invite_accepted` no callback |

Rotas Auth importam **somente** o orchestrator — nunca o barrel `@/modules/access`.

### Código

```
src/modules/access/
├── gate.server.ts
├── post-auth.server.ts
├── post-auth-orchestrator.server.ts
├── recovery.server.ts
├── admin-profiles.server.ts
├── recovery-actions.ts
├── lifecycle-normalize.ts
├── internal/access-db.server.ts
└── services/
    ├── resolve-blocked-redirect.ts
    ├── resolve-post-auth-destination.ts
    └── resolve-user-context.ts

src/lib/access.functions.server.ts   # barrel de compatibilidade
```

---

## Admin

### Responsável por

| Operação                    | API / rota                                       |
| --------------------------- | ------------------------------------------------ |
| Criar usuário               | `createUserAccount` → `inviteUserByEmail`        |
| Excluir usuário             | Recovery Mode → `delete_user`                    |
| Reenviar convite            | Recovery Mode → `resend_invite`                  |
| Enviar redefinição de senha | Recovery Mode → `force_password_reset`           |
| Recovery Mode (UI)          | `/admin/usuarios/$userId` — 3 ações operacionais |
| Auditoria                   | `access_audit_log`                               |

Admin **dispara** operações Supabase Auth e **delega** lifecycle/audit ao Access.
Admin **não** implementa callback, sessão ou login.

### Código

```
src/modules/admin/
├── invites.server.ts           # inviteUserByEmail, resetPasswordForEmail
└── components/
    └── RecoveryModePanel.tsx   # 3 ações operacionais
```

---

## Cliente (domínio)

Responsável por empresas, dados analíticos, dashboards, relatórios e integrações.

**Auth nunca deve importar ou conhecer este domínio.** Acesso a clientes específicos é decidido
por Access (`client_access`, `current_user_clientes`, RLS) — não pelo módulo Auth.

---

## Regra de Ouro — anti-acoplamento

> Nenhuma tela co-importa `@/modules/auth` e barrel `@/modules/access`.

| Permitido                                          | Proibido                                      |
| -------------------------------------------------- | --------------------------------------------- |
| Tela importa `modules/auth` apenas                 | Tela importa auth + access barrel             |
| Tela importa orchestrator + auth (rotas `/auth/*`) | `modules/auth/**` importa `modules/access/**` |
| Shell autenticado (allowlist)                      | Decisão de lifecycle dentro do Auth           |

**Enforcement:** ESLint `no-restricted-imports` + `scripts/validate-auth-boundaries.mjs` no `npm run check`.

---

## Fluxos oficiais (Supabase)

### Login

```
/auth → signInWithPassword → postAuthOnLoginSuccess → /admin | /dashboard | bloqueio
```

### Logout

```
useSignOut → signOut → /auth
```

### Convite (sem auto-login)

```
e-mail → /auth/callback → set-password → updateUser → orchestrator → signOut → /auth (login)
→ signInWithPassword → postAuthOnLoginSuccess → dashboard
```

### Recuperação (sem auto-login)

```
forgot-password → e-mail → /auth/callback → set-password (recovery) → updateUser
→ orchestrator → signOut → login normal
```

### Alteração da própria senha

```
/account/security → reauth (signInWithPassword) → updateUser → postAuthOnPasswordChangedByUser
```

### Recovery Mode (admin)

```
/admin/usuarios/$userId → performAccessRecovery(action) → lifecycle + audit + Auth API
```

Ações disponíveis: `resend_invite`, `force_password_reset`, `delete_user`.

Limitação operacional conhecida e workaround oficial documentados em
[Known Operational Limitation — Recovery Mode (v3)](../03-backend/auth-module-v3.md#known-operational-limitation--recovery-mode-v3).

---

## Estrutura de diretórios (resumo)

| Caminho                                     | Módulo                                                    |
| ------------------------------------------- | --------------------------------------------------------- |
| `src/modules/auth/`                         | Auth                                                      |
| `src/modules/access/`                       | Access                                                    |
| `src/modules/admin/`                        | Admin (usuários)                                          |
| `src/features/auth/`                        | Stubs deprecated — migrar imports para `modules/auth`     |
| `src/features/access/`                      | Domínio Access legado (em migração para `modules/access`) |
| `src/routes/auth/`                          | Adapters finos                                            |
| `src/routes/_authenticated/admin/usuarios*` | UI Admin usuários                                         |

---

## Referências

- [Auth Module v3 — registro de entrega](../03-backend/auth-module-v3.md)
- [Autenticação & Autorização (operacional)](../03-backend/auth.md)
- [ADR-0014 — Auth Module v3](./adr/0014-auth-module-v3-architecture.md)
- [Roadmap — evoluções Auth](../11-roadmap/roadmap.md#auth--access--próximas-evoluções)
