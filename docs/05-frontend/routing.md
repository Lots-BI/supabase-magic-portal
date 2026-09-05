---
title: Frontend — Roteamento & Guardas
description: Mapa de rotas file-based, guarda de autenticação e navegação por papel.
status: living
owner: Engenharia Lots BI
last_review: 2026-06-26
---

# Roteamento & Guardas

O Lots BI usa **file-based routing** do TanStack Start. Cada arquivo em `src/routes` é uma
rota. `routeTree.gen.ts` é **gerado automaticamente** — nunca editar à mão. Convenções
completas em `src/routes/README.md`.

> Não criar `src/pages/` nem `app/layout.tsx` (convenções de Next/Remix). O único layout raiz
> é `src/routes/__root.tsx`.

---

## Mapa de rotas

```mermaid
flowchart TD
    root["__root.tsx (shell)"] --> idx["/ → redirect"]
    root --> auth["/auth (login)"]
    root --> authed["_authenticated (guarda)"]

    authed --> dash["/dashboard (cliente)"]
    authed --> aprov["/aprovacoes"]
    authed --> cli["/cliente/$cliente (layout)"]
    cli --> cliIdx["/cliente/$cliente (visão geral)"]
    cli --> cliAprov["/cliente/$cliente/aprovacoes"]
    cli --> cliPlat["/cliente/$cliente/{instagram,meta-ads,...}"]

    authed --> admin["/admin (guarda admin na UI)"]
    admin --> admIdx["/admin (centro executivo)"]
    admin --> admRel["/admin/relatorios"]
    admin --> admEd["/admin/editorial"]
    admin --> admCli["/admin/clientes · /novo · /$id"]
    admin --> admUsr["/admin/usuarios · /novo"]
    admin --> admSrv["/admin/servicos"]
    admin --> admDbg["/admin/debug · /debug/views"]
```

---

## Guarda de autenticação

`src/routes/_authenticated/route.tsx`:

- `ssr: false` + `beforeLoad` chama `supabase.auth.getUser()`. Sem usuário → `redirect({ to: "/auth" })`.
- Em `/` (`index.tsx`), redireciona para `/dashboard` (logado) ou `/auth`.

```mermaid
sequenceDiagram
    participant U as Usuário
    participant R as _authenticated.beforeLoad
    participant SB as Supabase Auth
    U->>R: acessa rota protegida
    R->>SB: getUser()
    alt sem sessão
        R-->>U: redirect /auth
    else com sessão
        R-->>U: renderiza AppShell + Outlet
    end
```

---

## Navegação por papel

No layout autenticado, `checkIsAdmin` (server fn) define os grupos de navegação:

- **Cliente:** Visão geral (`/dashboard`), Aprovações (`/aprovacoes`).
- **Admin visualizando cliente:** em `/cliente/:slug/*`, Aprovações aponta para
  `/cliente/:slug/aprovacoes` (modo `slug_context` via `ClientScopeProvider`).
- **Admin:** Operações (visão geral, relatórios, editorial, clientes, usuários, serviços) +
  Diagnóstico (debug, auditoria de views).
- Admin também vê atalho "Painel admin" e o seletor **"Ver como cliente"**
  (`ImpersonateClienteMenu`) — que apenas **navega** para a página do cliente, não impersona
  sessão.

> A navegação admin é decidida na UI (via `checkIsAdmin`). A **barreira real** continua sendo
> a RLS + `assertAdmin` nas server functions — a UI esconder o link não substitui a checagem
> de servidor.

---

## Resolução de cliente (slug → nome canônico)

`/cliente/$cliente` usa `slug`. `clienteRefQuery`
(`src/routes/_authenticated/cliente.$cliente.tsx`) resolve o `slug` para o **nome canônico**
(`queryName`) usado nas queries das views, casando por `cadastro_clientes.slug` ou por
`slugify(vw_clientes_ativos.cliente)`. As subrotas de plataforma só aparecem quando há dados
(`clientePlatformsQuery`).
