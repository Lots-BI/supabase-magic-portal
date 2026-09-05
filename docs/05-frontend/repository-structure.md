---
title: Estrutura do Repositório
description: Organização de pastas, convenções de nomes e mapa de módulos do código.
status: living
owner: Engenharia Lots BI
last_review: 2026-06-30
---

# Estrutura do Repositório

Raiz do app: `lots-bi/`

---

## Árvore principal

```
lots-bi/
├── .cursor/rules/          # Regras Cursor (engenharia + docs)
├── docs/                   # Engineering Handbook (este centro de conhecimento)
├── public/                 # Assets estáticos
├── src/
│   ├── routes/             # TanStack Router (file-based)
│   ├── modules/            # Módulos de domínio (Auth v3)
│   │   ├── auth/           # Autenticação — sessão apenas
│   │   ├── access/         # Autorização — lifecycle, gate, orchestrator
│   │   └── admin/          # Gestão de usuários — convites, Recovery Mode UI
│   ├── features/           # Legado em migração (access, auth stubs deprecated)
│   ├── components/
│   │   ├── lots/          # Componentes de domínio Lots BI
│   │   └── ui/             # Primitivos shadcn/Radix
│   ├── lib/                # Lógica de negócio pura
│   │   └── platforms/      # Engine declarativo de plataformas
│   ├── integrations/       # Clientes Supabase + auth middleware
│   ├── hooks/              # Hooks React reutilizáveis
│   ├── router.tsx          # createRouter + QueryClient
│   ├── start.ts            # Middlewares globais TanStack Start
│   └── server.ts           # Entry SSR + tratamento de erros
├── supabase/
│   └── migrations-official/  # DDL versionado (01–08)
├── .env.example            # Template de variáveis
├── AGENTS.md               # Avisos Lovable + fluxo Lots BI
├── package.json
└── vite.config.ts          # Preset Lovable (transitório)
```

---

## `src/routes/` — roteamento

Convenção TanStack Start: arquivo = rota.

| Padrão                     | Exemplo               | Significado        |
| -------------------------- | --------------------- | ------------------ |
| `index.tsx`                | `/`                   | Raiz               |
| `auth/index.tsx`           | `/auth`               | Auth thin adapter  |
| `auth/callback.tsx`        | `/auth/callback`      | Callback Supabase  |
| `_authenticated/route.tsx` | Layout                | Guard + shell      |
| `cliente.$cliente.tsx`     | `/cliente/:cliente`   | Parâmetro dinâmico |
| `admin/clientes.$id.tsx`   | `/admin/clientes/:id` | Aninhado           |

`routeTree.gen.ts` é **gerado** — nunca editar manualmente.

Detalhes: [Roteamento](./routing.md)

---

## `src/modules/` — Auth Module v3

| Módulo    | Responsabilidade                                    |
| --------- | --------------------------------------------------- |
| `auth/`   | Login, logout, sessão, callback, set-password UI    |
| `access/` | Lifecycle, bloqueios, orchestrator, Recovery server |
| `admin/`  | Convites, Recovery Mode UI, operações de usuário    |

Detalhes: [Arquitetura Auth, Access e Admin](../02-architecture/auth-access-admin.md).

---

## `src/lib/` — lógica de negócio

| Módulo                       | Responsabilidade                                   |
| ---------------------------- | -------------------------------------------------- |
| `platforms/*`                | Engine declarativo, fórmulas, PlatformDefs         |
| `metrics.ts`                 | Agregação overview cross-platform                  |
| `period.ts`                  | Datas BRT, presets de período                      |
| `admin.functions.ts`         | Server functions administrativas                   |
| `access.functions.server.ts` | Barrel Access (compat — preferir `modules/access`) |
| `editorial.functions.ts`     | Server functions editorial                         |
| `integrations-catalog.ts`    | Catálogo de integrações (formulário admin)         |
| `error-capture.ts`           | Recuperação de erros SSR (h3)                      |
| `error-page.ts`              | HTML de erro 500                                   |
| `lovable-error-reporting.ts` | Report client → Lovable (transitório)              |
| `utils.ts`                   | `cn()` — merge de classes Tailwind                 |

**Regra:** componentes React **não** contêm cálculos de KPI.

---

## `src/components/lots/` — UI de domínio

Componentes reutilizáveis do produto: `PlatformDashboard`, `AppShell`, `StatCard`,
`PeriodToggle`, charts, etc.

Catálogo: [Design System](./component-system.md)

---

## `src/integrations/supabase/`

| Arquivo              | Uso                      |
| -------------------- | ------------------------ |
| `client.ts`          | Browser — anon key + JWT |
| `client.server.ts`   | Servidor — service-role  |
| `auth-middleware.ts` | `requireSupabaseAuth`    |
| `auth-attacher.ts`   | `attachSupabaseAuth`     |

---

## `supabase/migrations-official/`

Migrations numeradas, aditivas, idempotentes. Ordem:

| #   | Arquivo                                | Tema                                  |
| --- | -------------------------------------- | ------------------------------------- |
| 01  | `auth_roles_access.sql`                | Auth, roles, `current_user_clientes`  |
| 02  | `views_metricas.sql`                   | Views analíticas iniciais             |
| 03  | `cadastro_clientes_extensao.sql`       | Clientes, serviços, RLS               |
| 05  | `cadastro_clientes_make_ids.sql`       | IDs técnicos Make                     |
| 06  | `editorial.sql`                        | Posts, revisões                       |
| 07  | `views_fix_security_invoker.sql`       | SECURITY DEFINER                      |
| 08  | `aliases_e_null_guard.sql`             | Aliases + NULL guard                  |
| 09  | `owner_admin_guard.sql`                | Admin permanente do dono              |
| 10  | `editorial_media.sql`                  | Mídia editorial                       |
| 11  | `plano_estrategico.sql`                | Plano Estratégico                     |
| 12  | `plano_objetivo_scope.sql`             | Escopo por objetivo no plano          |
| 13  | `access_management.sql`                | Lifecycle, audit, access_accounts     |
| 14  | `access_lifecycle_fix.sql`             | Backfill lifecycle                    |
| 15  | `auth_invalidate_sessions.sql`         | RPC invalidação de sessões            |
| 16  | `lifecycle_invite_expired_removal.sql` | Dados invite_expired → invite_pending |

> Não existe migration `04` (deprecada).

---

## Alias de import

`@/` → `src/` (tsconfig + Vite).

---

## O que NÃO está no repositório

| Item                        | Status                            |
| --------------------------- | --------------------------------- |
| Cenários Make               | Externo                           |
| CI/CD (`.github/workflows`) | Não implementado                  |
| Testes (`*.test.ts`)        | Implementado (Vitest, 88+ testes) |
| `supabase/config.toml`      | Não presente                      |
| Schema DDL `base_metricas`  | Não versionado                    |

---

## Referências

- [Arquitetura Auth, Access e Admin](../02-architecture/auth-access-admin.md)
- [Organização de código](../09-standards/code-organization.md)
- [Engine de métricas](../06-engine/overview.md)
- [Arquitetura — estado atual](../02-architecture/current-state.md)
