---
title: Publicações Instagram — Dashboard por post
description: Coleta e visualização de métricas por publicação via Platform Hub + Meta Graph API.
status: living
owner: Engenharia Lotus
last_review: 2026-09-01
---

# Publicações Instagram

Área exclusiva para métricas **por publicação** (Feed, Reels, Carrossel, Stories), separada do dashboard diário de perfil (`/cliente/:slug/instagram`).

> **Perfil vs. publicações — dois syncs independentes, mesma conexão `instagram_organic`:**
> `/instagram` (perfil/conta, `syncInstagramProfileFn`, capability `instagram_organic:profile:collect`,
> grava em `base_metricas_hub`) e `/publicacoes` (posts, `syncInstagramPostsFn` nesta página,
> capability `instagram_organic:metrics:collect`, grava em `ig_media`). Clicar em um não afeta o
> outro. Detalhe do sync de perfil: [instagram.md](./platforms/instagram.md).

## Rota

- Cliente: `/cliente/:slug/publicacoes`
- Menu lateral do cliente (quando Instagram está ativo)

## Coleta

- Plugin Hub: `instagram_organic`
- OAuth Meta com scopes `instagram_manage_insights`, etc.
- Sync manual: botão **Puxar métricas** (cooldown 5 min)
- Admin: `/admin/conexoes` → sincronizar conexão Instagram

## Conexão self-service do cliente

Além do fluxo admin (`/admin/conexoes/nova`), o cliente pode conectar o próprio Instagram
sozinho em `/cliente/:slug/conexoes` (componente `ClientConnectionsPage.tsx`). Server functions
dedicadas em `src/modules/platform-hub-client/hub-client.server.ts`:

- `getClientInstagramConnectionStatusFn` / `createClientInstagramConnectionFn` /
  `startClientInstagramOAuthFn` / `discoverClientInstagramIdentitiesFn` /
  `attachClientInstagramIdentityFn`.
- Todas checam `assertClientPortalAccess` (dono do cadastro) ou admin, e travam a operação ao
  `pluginKey` liberado em `CLIENT_SELF_SERVICE_PLUGIN_KEY` (hoje só `instagram_organic` —
  único confirmado ponta a ponta). Reaproveita o mesmo `AdminHubStack`, `HubOAuthHandle` e
  `discoverIdentitiesForPlugin` do fluxo admin — só a checagem de acesso e o escopo de
  plugin/cliente mudam.
- `sanitizeOAuthRedirectAfter` aceita `/cliente/{slug}/conexoes` além dos paths
  `/admin/conexoes/*`.
- OAuth reaproveita popup + callback compartilhados (`oauth-popup.ts`,
  `/oauth/meta/callback` → `completeHubMetaOAuth`, que não é admin-gated).

## Sync automático (pendente)

> **Status:** à fazer após merge da branch `feature/instagram-post-metrics`.

A rota já existe: `GET /api/cron/instagram-media-sync` (header `Authorization: Bearer <CRON_SECRET>`).

| Opção | Situação |
| ----- | -------- |
| **Vercel Cron** (`vercel.json`) | Adiado — exige plano **Pro** na Vercel |
| **GitHub Actions** (recomendado, gratuito) | Workflow `.github/workflows/instagram-media-sync-cron.yml` — configurar secrets `APP_URL` + `CRON_SECRET` após merge em `main` |
| **Cloudflare Cron Triggers** | Futuro — deploy proprietário já usa Workers; avaliar quando cutover Lovable → CF |
| **Manual** | Sempre disponível (botão na UI + admin) |

Horário alvo: **23:58** America/Sao_Paulo (`58 2 * * *` UTC).

Teste manual:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/instagram-media-sync"
```

## Dados

- Tabelas: `ig_media`, `ig_media_metrics_history`
- View: `vw_ig_media_dashboard`
- Thumbnails: bucket `ig-media-thumbs`

## Gate B

```bash
npm run ig:gate-b
```

Requer `IG_GATE_B_ACCESS_TOKEN` ou `GATE_A_META_ACCESS_TOKEN` e conexão `instagram_organic` ativa.

## Setup Meta

Ver [meta-instagram-setup.md](../07-integrations/meta-instagram-setup.md).
