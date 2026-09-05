---
title: Frontend — Visão Geral
description: Stack, estrutura de pastas, padrões de estado e tema.
status: living
owner: Engenharia Lots BI
last_review: 2026-06-26
---

# Frontend — Visão Geral

## Stack

- **React 19** + **TanStack Start** (SSR + file-based routing via `@tanstack/react-router`).
- **TanStack React Query** para data fetching/cache.
- **Tailwind CSS v4** + **Radix UI** + componentes shadcn-style (`src/components/ui`).
- **Recharts** (gráficos), **lucide-react** (ícones), **sonner** (toasts), **motion**.
- Validação de formulários com **react-hook-form** + **zod** (`@hookform/resolvers`).

## Estrutura de pastas

```text
src/
├── routes/                 # Rotas (file-based). Ver routing.md
│   ├── __root.tsx          # Shell HTML, providers, meta, tema anti-FOUC
│   ├── index.tsx           # Redireciona / -> /dashboard ou /auth
│   ├── auth.tsx            # Login/signup
│   └── _authenticated/     # Tudo que exige login (guarda em route.tsx)
├── components/
│   ├── ui/                 # Kit base shadcn/Radix (button, table, dialog...)
│   └── lots/              # Design system Lots BI (AppShell, StatCard, charts...)
├── lib/                    # Lógica de negócio pura + server functions
│   ├── platforms/          # Engine declarativo de plataformas
│   ├── metrics.ts          # Agregação do overview + insights
│   ├── period.ts           # Janelas temporais (America/Sao_Paulo)
│   ├── admin.functions.ts  # Server functions admin
│   └── editorial.functions.ts
├── integrations/supabase/  # Clients + middlewares de auth
├── hooks/                  # use-mobile, use-dirty-blocker
├── router.tsx              # createRouter + QueryClient
├── start.ts                # Middlewares globais
└── server.ts               # Entrypoint SSR + erro
```

## Providers e shell

`src/routes/__root.tsx` monta o app:

- `QueryClientProvider` (React Query).
- `ThemeProvider` (`src/components/lots/theme-provider.tsx`) + `Toaster` (sonner).
- Meta tags do Lots BI (título, OG, theme-color `#9769b1`).
- Script anti-FOUC: lê o tema de `localStorage` (`lotus-theme`) antes da hidratação.
- Escuta `supabase.auth.onAuthStateChange` para invalidar rotas/queries em login/logout.

## Padrões de data fetching

- Queries declaradas como `queryOptions` com `queryKey` que inclui parâmetros relevantes
  (cliente, período) para cache correto.
- Rotas usam `loader` para `ensureQueryData` (prefetch) e `useSuspenseQuery` no corpo.
- `<Suspense>` + _skeletons_ (`lots-skeleton`) para carregamento; _empty states_ dedicados.

## Estado de UI

- Período é estado local da página (`useState<PeriodInput>`) resolvido por `resolvePeriod`.
- Não há store global (Redux/Zustand); o estado de servidor é o React Query e o estado de
  sessão é o Supabase.

## Tema

- Claro/escuro via classe `dark` no `<html>`, persistido em `localStorage`.
- Tokens de cor/spacing definidos em `src/styles.css` (Tailwind v4) e usados via utilitários
  `lots-*` (ex.: `lots-surface`, `lots-skeleton`, `lots-focus`).

Ver também: [Roteamento](./routing.md) e [Design System & Engine](./component-system.md).
