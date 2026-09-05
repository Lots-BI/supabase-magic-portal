---
title: ADR-0001 — TanStack Start + Supabase como base
status: Aceito
date: 2026-06-26
---

# ADR-0001 — TanStack Start + Supabase como base

## Contexto

O Lots BI precisa de uma aplicação web com SSR, autenticação, banco relacional, segurança por
linha (multi-tenant) e ciclo de desenvolvimento rápido — com um time pequeno e sem desejo de
manter infraestrutura de backend dedicada. O projeto foi inicialmente prototipado no Lovable;
desde [ADR-0010](./0010-cursor-official-development-environment.md), o desenvolvimento oficial
é feito no **Cursor** + repositório Git.

## Decisão

Adotar **TanStack Start** (React 19, roteamento por arquivos, SSR, server functions) no
frontend/edge e **Supabase** (Postgres + Auth + RLS) como backend de dados e autenticação.
A lógica de servidor mora em _server functions_ do próprio TanStack Start; não há serviço
backend separado.

## Alternativas consideradas

- **Next.js + backend dedicado (Node/Nest):** mais flexível, porém mais infra para manter e
  mais código para um time pequeno.
- **SPA pura + Supabase:** sem SSR; pior SEO/meta e sem camada de servidor para segredos.
- **Firebase:** modelo NoSQL não combina com a forte natureza relacional/analítica do domínio.

## Consequências

### Positivas

- Uma stack TypeScript de ponta a ponta.
- RLS do Postgres como barreira de segurança real (não só na UI).
- Server functions para segredos e operações privilegiadas sem servidor extra.
- Integração nativa com Lovable e deploy via Nitro/Cloudflare.

### Negativas / dívidas

- Forte acoplamento ao ecossistema TanStack Start (ainda em evolução) e ao Supabase.
- A segurança depende de RLS bem escrita — erros em policies/views vazam dados (ver
  [ADR-0003](./0003-views-security-definer.md)).
- O frontend lê views diretamente com a anon key, reduzindo defesa em profundidade para
  leitura analítica.
