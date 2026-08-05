---
title: Variáveis de ambiente — Platform Hub & Admin
description: Inventário auditado de todas as variáveis usadas pelo Platform Hub e pelo módulo administrativo.
status: living
owner: Engenharia Lotus
last_review: 2026-07-09
---

# Variáveis de ambiente — Platform Hub & Admin

Documento gerado por auditoria estática do repositório (`process.env`, `import.meta.env`, scripts e workflows). Abrange:

- **Platform Hub** — kernel, bridges, OAuth, writers, homologação, Gate A
- **Módulo administrativo** — `/admin/*`, server functions, convites, diagnóstico, client Supabase admin

> **Prefixo `OFFICIAL_`:** exigência transitória do preset Lovable. Não use `SUPABASE_*` para segredos novos.

---

## Legenda

| Campo | Significado |
| ----- | ----------- |
| **Obrigatório** | `sim` = app/admin quebra sem ela no cenário indicado; `condicional` = só quando a feature é usada; `não` = opcional com default |
| **Ambiente** | `dev` · `staging` · `prod` · `ci` (GitHub Actions) · `local-cli` (scripts Gate A) |

---

## 1. Supabase (fundação do admin)

Necessárias para autenticação, RLS no browser, server functions e `getSupabaseAdmin()` (Platform Hub `ph_*`, criação de usuários, debug).

| Variável | Obrigatório | Descrição | Onde é usada | Exemplo (sem segredos) | Ambiente | Como obter |
| -------- | ----------- | --------- | ------------ | ---------------------- | -------- | ---------- |
| `VITE_OFFICIAL_SUPABASE_URL` | sim (browser) | URL pública do projeto Supabase embutida no build Vite | `integrations/supabase/public-config.ts`, `env.server.ts` | `https://ywvhoctcmibjitvwkkhb.supabase.co` | dev, staging, prod, ci | [Supabase Dashboard](https://supabase.com/dashboard) → Project → **Settings → API** → Project URL |
| `VITE_OFFICIAL_SUPABASE_ANON_KEY` | sim (browser) | Chave anon/public (protegida por RLS) | `public-config.ts`, `client.ts`, `SupabaseConfigGuard.tsx` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | dev, staging, prod, ci | Supabase → **Settings → API** → `anon` `public` |
| `VITE_OFFICIAL_SUPABASE_PROJECT_ID` | não | ID do projeto; fallback hardcoded `ywvhoctcmibjitvwkkhb` | `public-config.ts` | `ywvhoctcmibjitvwkkhb` | dev, staging, prod, ci | Supabase → **Settings → General** → Reference ID |
| `OFFICIAL_SUPABASE_URL` | sim (servidor) | URL do projeto para server functions / admin client | `env.server.ts`, `client.server.ts`, scripts `ensure-owner-admin.mjs`, `audit-client-portal.mjs` | `https://ywvhoctcmibjitvwkkhb.supabase.co` | dev, staging, prod, ci, local-cli | Mesmo valor de `VITE_OFFICIAL_SUPABASE_URL` |
| `OFFICIAL_SUPABASE_ANON_KEY` | sim (servidor) | Chave anon no runtime do servidor | `env.server.ts`, `admin.functions.ts` (auth), `system-diagnostics.server.ts` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | dev, staging, prod, ci | Mesmo valor de `VITE_OFFICIAL_SUPABASE_ANON_KEY` |
| `OFFICIAL_SERVICE_ROLE_KEY` | sim (admin + Hub) | Service role — bypass RLS; **nunca** prefixar com `VITE_` | `client.server.ts`, `credential-crypto.ts` (fallback), Gate A scripts | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | dev, staging, prod, ci, local-cli | Supabase → **Settings → API** → `service_role` (secret) |

### Aliases legados (Lovable / migração)

Aceitos por `env.server.ts` e `public-config.ts` — preferir nomes `OFFICIAL_*` / `VITE_OFFICIAL_*`:

| Alias | Substitui |
| ----- | --------- |
| `VITE_SUPABASE_URL`, `SUPABASE_URL` | `VITE_OFFICIAL_SUPABASE_URL` / `OFFICIAL_SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY` | `VITE_OFFICIAL_SUPABASE_ANON_KEY` / `OFFICIAL_SUPABASE_ANON_KEY` |
| `VITE_SUPABASE_PROJECT_ID` | `VITE_OFFICIAL_SUPABASE_PROJECT_ID` |

---

## 2. URL pública do portal (admin + OAuth)

Usadas em convites Supabase Auth (`admin.functions.ts`), diagnóstico (`/admin/debug`) e **redirect URIs OAuth** do Platform Hub (`hub-admin.server.ts` → `resolveServerAppUrl()`).

| Variável | Obrigatório | Descrição | Onde é usada | Exemplo | Ambiente | Como obter |
| -------- | ----------- | --------- | ------------ | ------- | -------- | ---------- |
| `APP_URL` | sim (prod) | URL canônica do portal, sem barra final | `app-url.server.ts`, `hub-admin.server.ts`, `deploy.yml`, `SETUP.md` | `https://lotsbi.leandromajr.com` | dev: `http://localhost:5173`; staging/prod/ci: domínio real | Configurar no `.env` local ou secrets Lovable / Cloudflare / GitHub Actions |
| `SITE_URL` | não | Alias de fallback para `APP_URL` | `app-url.server.ts` | `https://lotsbi.leandromajr.com` | staging, prod | Mesmo que `APP_URL` |
| `VITE_APP_URL` | não | Alias embutido no build (Vite) | `app-url.server.ts` | `http://localhost:5173` | dev, ci | Opcional; duplicar `APP_URL` se necessário no build |
| `PUBLIC_APP_URL` | não | Alias de fallback | `app-url.server.ts` | `https://lotsbi.leandromajr.com` | staging, prod | Mesmo que `APP_URL` |
| `OFFICIAL_PRODUCTION_APP_URL` | não | URL de produção esperada — validação em diagnóstico de auth | `system-diagnostics.server.ts`, `.env.example` | `https://lotsbi.leandromajr.com` | prod | Domínio oficial acordado com Ops |
| `PRODUCTION_APP_URL` | não | Alias legado para diagnóstico | `system-diagnostics.server.ts` | `https://lotsbi.leandromajr.com` | prod | Mesmo que `OFFICIAL_PRODUCTION_APP_URL` |
| `STAGING_APP_URL` | não | URL de preview/homologação para diagnóstico | `system-diagnostics.server.ts` | `https://preview.lotsbi.example.com` | staging | URL do deploy preview |

### Callbacks OAuth (derivados de `APP_URL`)

Registrar nos consoles das plataformas (não são variáveis separadas):

| Plataforma | Path | Exemplo completo |
| ---------- | ---- | ---------------- |
| Meta Ads | `/oauth/meta/callback` | `{APP_URL}/oauth/meta/callback` |
| Google (Ads, GA4, GBP, YouTube) | `/oauth/google/callback` | `{APP_URL}/oauth/google/callback` |
| TikTok | `/oauth/tiktok/callback` | `{APP_URL}/oauth/tiktok/callback` |

Rotas: `src/routes/oauth/*/callback.tsx` · Factory: `platform-hub-admin/services/hub-oauth.factory.ts`

---

## 3. Platform Hub — writers e homologação

Controlam persistência de métricas em `base_metricas_hub` (migration `30_parallel_metricas_homologation.sql`).

| Variável | Obrigatório | Descrição | Onde é usada | Exemplo | Ambiente | Como obter |
| -------- | ----------- | --------- | ------------ | ------- | -------- | ---------- |
| `PLATFORM_HUB_WRITER_TARGET` | não | Destino lógico do writer: `HUB` (default), `BOTH` ou `MAKE` (bloqueado — lança erro) | `platform-hub-bridges/base-metricas/writer-target.config.ts` | `HUB` | dev, staging, prod | Definir no secret do ambiente; **não** usar `MAKE` no Hub |
| `PLATFORM_HUB_SUPABASE_WRITER` | condicional | Habilita escrita Supabase. **Dois contextos com defaults diferentes** (ver nota abaixo) | `writer-target.config.ts`, `metric-pipeline/writers/writer-config.ts`, `ai-workspace/sources/data-sources.ts` | `true` | homologação/staging: `true`; prod kernel passivo: `false` até cutover | Secret do ambiente |

**Nota — defaults de `PLATFORM_HUB_SUPABASE_WRITER`:**

| Módulo | Comportamento se ausente |
| ------ | ------------------------ |
| `writer-target.config.ts` (bridge homologação) | **habilitado** (`true`) |
| `writer-config.ts` (metric-pipeline kernel) | **desabilitado** (`false`) |
| `createAdminHubStack()` | passa `supabaseWriterEnabled: true` explicitamente — admin sempre grava no Hub quando o stack admin roda |

Valores truthy aceitos: `true`, `1`, `yes`, `on` (case-insensitive).

---

## 4. Platform Hub — Credential Vault

Criptografia AES-256-GCM de tokens OAuth em `ph_credentials`.

| Variável | Obrigatório | Descrição | Onde é usada | Exemplo | Ambiente | Como obter |
| -------- | ----------- | --------- | ------------ | ------- | -------- | ---------- |
| `HUB_CREDENTIAL_ENCRYPTION_KEY` | condicional | Segredo dedicado para criptografar credenciais no vault | `platform-hub-bridges/ph-persistence/credential-crypto.ts` | `openssl rand -base64 32` (ex.: `K7x...`) | staging, prod | Gerar string aleatória forte (32+ bytes); armazenar em secret manager |
| `OFFICIAL_SERVICE_ROLE_KEY` | fallback | Usado se `HUB_CREDENTIAL_ENCRYPTION_KEY` ausente | `credential-crypto.ts` | (service role) | dev | Supabase API — **recomendado usar chave dedicada em produção** |

---

## 5. Platform Hub — OAuth e APIs oficiais

Obrigatórias **somente** ao conectar plataformas via provider `official_api` no admin (`/admin/conexoes`).

### Google (Ads, GA4, Google Business Profile, YouTube)

Um único par OAuth cobre os quatro plugins Google.

| Variável | Obrigatório | Descrição | Onde é usada | Exemplo | Ambiente | Como obter |
| -------- | ----------- | --------- | ------------ | ------- | -------- | ---------- |
| `GOOGLE_OAUTH_CLIENT_ID` | condicional | Client ID OAuth 2.0 | `hub-oauth.factory.ts`, `plugins/_internal/oauth/create-registration-credential-access.ts` | `123456789.apps.googleusercontent.com` | dev, staging, prod | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials** → OAuth 2.0 Client ID (Web) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | condicional | Client secret OAuth 2.0 | idem | `GOCSPX-xxxxxxxx` | dev, staging, prod | Mesmo client OAuth → **Client secret** |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | condicional | Token de desenvolvedor Google Ads API (collect + identity discovery) | `plugins/google_ads/api/google-ads-client.ts`, `ph-persistence/services/google-ads-identity-discovery.ts` | `AbCdEfGhIjKlMnOp` | staging, prod | [Google Ads API Center](https://ads.google.com/aw/apicenter) → Developer token (aprovado) |

**Redirect URI no Google Cloud:** `{APP_URL}/oauth/google/callback`

### Meta Ads

| Variável | Obrigatório | Descrição | Onde é usada | Exemplo | Ambiente | Como obter |
| -------- | ----------- | --------- | ------------ | ------- | -------- | ---------- |
| `META_APP_ID` | condicional | App ID do Meta for Developers | `hub-oauth.factory.ts`, `create-registration-credential-access.ts` | `1234567890123456` | dev, staging, prod | [Meta for Developers](https://developers.facebook.com/) → App → **Settings → Basic** → App ID |
| `META_APP_SECRET` | condicional | App Secret | idem | `a1b2c3d4e5f6...` | dev, staging, prod | Mesmo app → **App Secret** (Show) |
| `META_OAUTH_INCLUDE_PUBLISH_SCOPES` | não | Se `1`, dialog OAuth Meta inclui scopes de publish (`pages_manage_posts` etc.). Preferir o botão **Reconectar + Publish** na UI | `resolveMetaOAuthDialogScopes` | `1` | local-cli / ops pontual | Só após Use Cases no App Dashboard — ver [manual-ops-checklist](../13-platform-hub/manual-ops-checklist.md) |

**Redirect URI no Meta:** `{APP_URL}/oauth/meta/callback` · Produto: Facebook Login + Marketing API
**Publish:** Use Cases + botão **Reconectar + Publish** — [marco4-publish-meta](../13-platform-hub/marco4-publish-meta.md)

### TikTok

| Variável | Obrigatório | Descrição | Onde é usada | Exemplo | Ambiente | Como obter |
| -------- | ----------- | --------- | ------------ | ------- | -------- | ---------- |
| `TIKTOK_APP_ID` | condicional | App ID / Client key | `hub-oauth.factory.ts`, `create-registration-credential-access.ts` | `7123456789012345678` | dev, staging, prod | [TikTok for Developers](https://developers.tiktok.com/) → App → **Credentials** |
| `TIKTOK_APP_SECRET` | condicional | Client secret | idem | `xxxxxxxxxxxxxxxx` | dev, staging, prod | Mesmo app → Client secret |

**Redirect URI no TikTok:** `{APP_URL}/oauth/tiktok/callback`

### Plataformas sem variável OAuth dedicada no código

| Plataforma | Observação |
| ---------- | ---------- |
| **GA4** | Usa `GOOGLE_OAUTH_*` |
| **Google Business Profile** | Usa `GOOGLE_OAUTH_*` |
| **YouTube** | Usa `GOOGLE_OAUTH_*` |
| **Make (passive)** | Sem OAuth no Hub — dados via pipeline Make existente |

---

## 6. Gate A — paridade Meta (engenharia / CLI)

Usadas por scripts e testes Vitest Gate A — **não** pela UI admin em runtime. Documentadas porque fazem parte do rollout Platform Hub.

| Variável | Obrigatório | Descrição | Onde é usada | Exemplo | Ambiente | Como obter |
| -------- | ----------- | --------- | ------------ | ------- | -------- | ---------- |
| `GATE_A_CONFIG` | condicional | Caminho para JSON de config do piloto | `scripts/rollout/gate-a/run-parity.mjs`, `gate-a-live.cli.test.ts` | `./fixtures/gate-a.config.json` | local-cli | Arquivo versionado ou local (não commitar tokens) |
| `GATE_A_META_ACCESS_TOKEN` | condicional | Token de acesso Meta para coleta live | `gate-a-config.ts`, `run-parity.mjs` | `EAAG...` | local-cli | Meta Graph API Explorer ou token de sistema do app |
| `META_ACCESS_TOKEN` | não | Alias de `GATE_A_META_ACCESS_TOKEN` | `gate-a-config.ts` | `EAAG...` | local-cli | idem |
| `GATE_A_MODE` | não | `demo` ou `live` (default `live`) | `gate-a-config.ts`, `run-parity.mjs` | `live` | local-cli | Export no shell |
| `GATE_A_DISCOVER` | condicional | Flag `1` para ativar teste de descoberta de pilotos | `discover-pilots.mjs`, `gate-a-discover.cli.test.ts` | `1` | local-cli | Setado automaticamente por `npm run gate-a:discover` |
| `GATE_A_DISCOVER_FROM` | não | Data início filtro YYYY-MM-DD | `gate-a-discover.cli.test.ts` | `2026-07-01` | local-cli | Export no shell |
| `GATE_A_DISCOVER_TO` | não | Data fim filtro YYYY-MM-DD | idem | `2026-07-07` | local-cli | Export no shell |
| `GATE_A_DISCOVER_MIN_ROWS` | não | Mínimo de linhas para candidato piloto (default `100`) | idem | `100` | local-cli | Export no shell |
| `GATE_A_DISCOVER_LIMIT` | não | Máximo de pilotos retornados (default `20`) | idem | `20` | local-cli | Export no shell |

Gate A também lê `OFFICIAL_SUPABASE_URL` + `OFFICIAL_SERVICE_ROLE_KEY` para baseline Make (read-only).

Runbook: `src/modules/platform-hub-bridges/gate-a-meta-staging/docs/RUNBOOK.md`

---

## 7. Runtime, diagnóstico e deploy

| Variável | Obrigatório | Descrição | Onde é usada | Exemplo | Ambiente | Como obter |
| -------- | ----------- | --------- | ------------ | ------- | -------- | ---------- |
| `NODE_ENV` | não (auto) | `development` ou `production` — validação de `APP_URL` localhost | `app-url.server.ts`, `system-diagnostics.server.ts` | `production` | prod, ci | Definido pelo runtime Node / Vite / Nitro |
| `CLOUDFLARE_API_TOKEN` | condicional | Token para `wrangler deploy` | `.github/workflows/deploy.yml`, `scripts/deploy-cloudflare.mjs` | `cf_...` | ci | [Cloudflare Dashboard](https://dash.cloudflare.com/) → My Profile → **API Tokens** |

---

## Matriz por ambiente

| Grupo | dev local | staging / homolog | produção |
| ----- | --------- | ----------------- | -------- |
| Supabase `VITE_OFFICIAL_*` + `OFFICIAL_*` | obrigatório | obrigatório | obrigatório |
| `OFFICIAL_SERVICE_ROLE_KEY` | recomendado (admin/Hub) | obrigatório | obrigatório |
| `APP_URL` | `http://localhost:5173` | URL preview | domínio público |
| OAuth (`META_*`, `GOOGLE_*`, `TIKTOK_*`) | opcional até testar conexões | obrigatório para homologação live | obrigatório para official providers |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | opcional | obrigatório p/ Google Ads | obrigatório p/ Google Ads |
| `HUB_CREDENTIAL_ENCRYPTION_KEY` | opcional (fallback OK) | recomendado | **recomendado** |
| `PLATFORM_HUB_WRITER_TARGET` | default `HUB` | `HUB` ou `BOTH` | `HUB` até cutover |
| `PLATFORM_HUB_SUPABASE_WRITER` | `true` no admin stack | `true` | conforme fase de rollout |
| Gate A (`GATE_A_*`) | CLI local apenas | CLI | CLI (não UI) |
| `CLOUDFLARE_API_TOKEN` | — | — | CI deploy |

---

## Checklist de validação (auditoria 2026-07-09)

Todas as variáveis abaixo foram encontradas no código e estão documentadas neste arquivo.

| Variável | Arquivo(s) de referência |
| -------- | ------------------------ |
| `APP_URL` | `src/lib/app-url.server.ts` |
| `SITE_URL` | `src/lib/app-url.server.ts` |
| `VITE_APP_URL` | `src/lib/app-url.server.ts` |
| `PUBLIC_APP_URL` | `src/lib/app-url.server.ts` |
| `OFFICIAL_PRODUCTION_APP_URL` | `src/lib/infra/system-diagnostics.server.ts` |
| `PRODUCTION_APP_URL` | `src/lib/infra/system-diagnostics.server.ts` |
| `STAGING_APP_URL` | `src/lib/infra/system-diagnostics.server.ts` |
| `NODE_ENV` | `src/lib/app-url.server.ts`, `system-diagnostics.server.ts` |
| `VITE_OFFICIAL_SUPABASE_URL` | `env.server.ts`, `public-config.ts` |
| `VITE_OFFICIAL_SUPABASE_ANON_KEY` | `env.server.ts`, `public-config.ts` |
| `VITE_OFFICIAL_SUPABASE_PROJECT_ID` | `public-config.ts` |
| `OFFICIAL_SUPABASE_URL` | `env.server.ts`, scripts |
| `OFFICIAL_SUPABASE_ANON_KEY` | `env.server.ts` |
| `OFFICIAL_SERVICE_ROLE_KEY` | `env.server.ts`, `client.server.ts`, `credential-crypto.ts` |
| `VITE_SUPABASE_URL` | `env.server.ts` (alias) |
| `SUPABASE_URL` | `env.server.ts` (alias) |
| `VITE_SUPABASE_ANON_KEY` | `env.server.ts` (alias) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `env.server.ts` (alias) |
| `SUPABASE_ANON_KEY` | `env.server.ts` (alias) |
| `VITE_SUPABASE_PROJECT_ID` | `public-config.ts` (alias) |
| `PLATFORM_HUB_WRITER_TARGET` | `writer-target.config.ts` |
| `PLATFORM_HUB_SUPABASE_WRITER` | `writer-target.config.ts`, `writer-config.ts` |
| `HUB_CREDENTIAL_ENCRYPTION_KEY` | `credential-crypto.ts` |
| `GOOGLE_OAUTH_CLIENT_ID` | `hub-oauth.factory.ts`, `create-registration-credential-access.ts` |
| `GOOGLE_OAUTH_CLIENT_SECRET` | idem |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | `google-ads-client.ts`, `google-ads-identity-discovery.ts` |
| `META_APP_ID` | `hub-oauth.factory.ts`, `create-registration-credential-access.ts` |
| `META_APP_SECRET` | idem |
| `TIKTOK_APP_ID` | `hub-oauth.factory.ts`, `create-registration-credential-access.ts` |
| `TIKTOK_APP_SECRET` | idem |
| `GATE_A_CONFIG` | `run-parity.mjs`, `gate-a-live.cli.test.ts` |
| `GATE_A_META_ACCESS_TOKEN` | `gate-a-config.ts` |
| `META_ACCESS_TOKEN` | `gate-a-config.ts` |
| `GATE_A_MODE` | `gate-a-config.ts`, `run-parity.mjs` |
| `GATE_A_DISCOVER` | `discover-pilots.mjs`, `gate-a-discover.cli.test.ts` |
| `GATE_A_DISCOVER_FROM` | `gate-a-discover.cli.test.ts` |
| `GATE_A_DISCOVER_TO` | `gate-a-discover.cli.test.ts` |
| `GATE_A_DISCOVER_MIN_ROWS` | `gate-a-discover.cli.test.ts` |
| `GATE_A_DISCOVER_LIMIT` | `gate-a-discover.cli.test.ts` |
| `CLOUDFLARE_API_TOKEN` | `.github/workflows/deploy.yml` |

**Resultado:** nenhuma variável `process.env.*` usada em `src/` ou `scripts/` do Platform Hub / admin ficou de fora.

---

## Referências

- Template local: [`.env.example`](../.env.example)
- Setup: [`SETUP.md`](../SETUP.md)
- Admin Platform Hub: [`docs/06-dashboards/platform-hub-admin.md`](./06-dashboards/platform-hub-admin.md)
- Deploy: [`docs/08-operations/deployment.md`](./08-operations/deployment.md)
- Ambientes: [`docs/08-operations/environments.md`](./08-operations/environments.md)
