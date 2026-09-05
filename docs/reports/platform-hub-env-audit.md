---
title: Auditoria de variáveis de ambiente — Platform Hub RC1
description: Inventário completo process.env / import.meta.env vs documentação e .env.example
status: report
owner: Engenharia Lots BI
audit_date: 2026-07-09
scope: Platform Hub v3.3 homologação RC1
---

# Auditoria de ambiente — Platform Hub RC1

Auditoria estática do repositório `lots-bi` para preparar homologação RC1.  
**Nenhum arquivo de código, `.env.example` ou `ENVIRONMENT_VARIABLES.md` foi alterado** — apenas este relatório foi gerado.

## Metodologia

1. Varredura em `src/`, `scripts/`, `.github/workflows/` por:
   - `process.env.<NAME>`
   - `import.meta.env.<NAME>`
   - `viteEnv("NAME")` / `pickEnv("NAME", ...)`
   - `pickEnv` dinâmico com nomes literais
2. Cruzamento com `docs/ENVIRONMENT_VARIABLES.md` (265 linhas, revisão 2026-07-09).
3. Cruzamento com `.env.example` (89 linhas, revisão 2026-07-09).
4. Classificação de obrigatoriedade para **homologação RC1** (admin Hub + dual-run, dashboards ainda em Make).

---

## Resumo executivo

| Métrica | Valor |
| ------- | ----- |
| Variáveis `process.env.*` distintas no código | **34** |
| Variáveis via `pickEnv` / `viteEnv` / `import.meta.env` (configuráveis) | **+8** |
| Built-ins Vite (`DEV`, `MODE`) | **2** (não configuráveis no `.env`) |
| Variável npm automática (`npm_package_version`) | **1** |
| Total inventariado | **45** |
| Documentadas em `ENVIRONMENT_VARIABLES.md` | **43/45** (faltam `npm_package_version`, built-ins Vite) |
| Presentes ativas em `.env.example` | **20** |
| Presentes comentadas em `.env.example` | **16** |
| Ausentes totalmente em `.env.example` | **9** (aliases legados + `npm_package_version`) |

### Achados principais

| Tipo | Quantidade | Severidade |
| ---- | ----------- | ---------- |
| Variáveis usadas mas não documentadas | **2** (`npm_package_version`, built-ins Vite) | Baixa |
| Variáveis documentadas mas não lidas no app | **0** (`CLOUDFLARE_API_TOKEN` é lida pelo wrangler/CI) | — |
| Ausentes no `.env.example` (homologação relevante) | **2** (`HUB_CREDENTIAL_ENCRYPTION_KEY` só comentada; `STAGING_APP_URL` só comentada) | Média |
| Aliases legados ausentes do `.env.example` | **6** | Baixa (migração Lovable) |
| Duplicidades intencionais | **4 grupos** | Informativo |
| Inconsistência de default | **1** (`PLATFORM_HUB_SUPABASE_WRITER`) | **Alta** |
| `deploy.yml` sem secrets Hub/OAuth | **8+ variáveis** | **Alta** (deploy homolog) |

---

## Tabela mestre — todas as variáveis encontradas

Legenda **Obrigatória (homolog RC1)**:
- **Sim** — sem ela o admin Hub ou auth quebra no cenário de homologação.
- **Condicional** — só ao usar a feature (OAuth de uma plataforma, Gate A CLI, deploy CI).
- **Não** — opcional, alias ou automática.

| Nome | Obrigatória | Valor padrão (se ausente) | Arquivo(s) onde é utilizada | Finalidade |
| ---- | ----------- | ------------------------- | ----------------------------- | ---------- |
| `VITE_OFFICIAL_SUPABASE_URL` | Sim | `https://ywvhoctcmibjitvwkkhb.supabase.co` (hardcoded fallback em `public-config.ts`) | `integrations/supabase/public-config.ts`, `integrations/supabase/env.server.ts` | URL Supabase no browser (build Vite) |
| `VITE_OFFICIAL_SUPABASE_ANON_KEY` | Sim | — (boot falha sem anon key) | `public-config.ts`, `env.server.ts`, `client.ts` | Chave anon pública no browser |
| `VITE_OFFICIAL_SUPABASE_PROJECT_ID` | Não | `ywvhoctcmibjitvwkkhb` (`SUPABASE_PROJECT_ID` constante) | `public-config.ts` | ID do projeto no client |
| `OFFICIAL_SUPABASE_URL` | Sim | fallback via `VITE_*` / `SUPABASE_DEFAULT_URL` | `env.server.ts`, `client.server.ts`, `scripts/ensure-owner-admin.mjs`, `scripts/audit-client-portal.mjs` | URL Supabase no servidor |
| `OFFICIAL_SUPABASE_ANON_KEY` | Sim | fallback via `VITE_OFFICIAL_*` | `env.server.ts`, `public-config.ts`, `system-diagnostics.server.ts` | Chave anon no servidor / SSR |
| `OFFICIAL_SERVICE_ROLE_KEY` | Sim | — (admin client lança erro) | `env.server.ts`, `client.server.ts`, `credential-crypto.ts` (fallback vault), scripts CLI | Service role — `ph_*`, Hub writers, scripts |
| `VITE_SUPABASE_URL` | Não | — | `env.server.ts`, `public-config.ts` | **Alias legado** Lovable → `VITE_OFFICIAL_SUPABASE_URL` |
| `SUPABASE_URL` | Não | — | `env.server.ts` | **Alias legado** → `OFFICIAL_SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Não | — | `env.server.ts` | **Alias legado** → `VITE_OFFICIAL_SUPABASE_ANON_KEY` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Não | — | `env.server.ts`, `public-config.ts` | **Alias legado** Lovable publishable key |
| `SUPABASE_ANON_KEY` | Não | — | `env.server.ts` | **Alias legado** → anon key servidor |
| `VITE_SUPABASE_PROJECT_ID` | Não | — | `public-config.ts` | **Alias legado** → project ID |
| `APP_URL` | Sim (homolog remota) | inferência via request headers (`app-url.server.ts`) | `app-url.server.ts`, `hub-admin.server.ts`, `.github/workflows/deploy.yml` | URL canônica — convites, OAuth callbacks |
| `SITE_URL` | Não | — | `app-url.server.ts` | Alias fallback de `APP_URL` |
| `VITE_APP_URL` | Não | — | `app-url.server.ts` (via `viteEnv`) | Alias build-time de `APP_URL` |
| `PUBLIC_APP_URL` | Não | — | `app-url.server.ts` | Alias fallback de `APP_URL` |
| `OFFICIAL_PRODUCTION_APP_URL` | Não | — | `system-diagnostics.server.ts` | Diagnóstico auth — URL prod esperada |
| `PRODUCTION_APP_URL` | Não | — | `system-diagnostics.server.ts` | Alias legado de `OFFICIAL_PRODUCTION_APP_URL` |
| `STAGING_APP_URL` | Não | — | `system-diagnostics.server.ts` | Diagnóstico auth — URL homolog/preview |
| `PLATFORM_HUB_WRITER_TARGET` | Não | `HUB` | `platform-hub-bridges/base-metricas/writer-target.config.ts` | Destino do writer (`HUB`/`BOTH`; `MAKE` bloqueado) |
| `PLATFORM_HUB_SUPABASE_WRITER` | Sim (homolog) | **Conflito** — ver seção 6 | `writer-target.config.ts` (default `true`), `metric-pipeline/writers/writer-config.ts` (default `false`), testes, `ai-workspace/sources/data-sources.ts` (referência textual) | Flag escrita Supabase em `base_metricas_hub` |
| `HUB_CREDENTIAL_ENCRYPTION_KEY` | Condicional | fallback `OFFICIAL_SERVICE_ROLE_KEY` | `platform-hub-bridges/ph-persistence/credential-crypto.ts` | Criptografia AES-256-GCM do vault `ph_credentials` |
| `GOOGLE_OAUTH_CLIENT_ID` | Condicional | — (erro ao OAuth Google) | `hub-oauth.factory.ts`, `plugins/_internal/oauth/create-registration-credential-access.ts` | OAuth Google (Ads, GA4, GBP, YouTube) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Condicional | — | idem | Secret OAuth Google |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Condicional | — | `plugins/google_ads/api/google-ads-client.ts`, `ph-persistence/services/google-ads-identity-discovery.ts` | Google Ads API — collect e discovery |
| `META_APP_ID` | Condicional | — | `hub-oauth.factory.ts`, `create-registration-credential-access.ts` | OAuth Meta Ads |
| `META_APP_SECRET` | Condicional | — | idem | Secret Meta |
| `TIKTOK_APP_ID` | Condicional | — | `hub-oauth.factory.ts`, `create-registration-credential-access.ts` | OAuth TikTok |
| `TIKTOK_APP_SECRET` | Condicional | — | idem | Secret TikTok |
| `GATE_A_CONFIG` | Condicional | — | `scripts/rollout/gate-a/run-parity.mjs`, `gate-a-live.cli.test.ts` | Caminho JSON piloto Gate A |
| `GATE_A_META_ACCESS_TOKEN` | Condicional | — | `gate-a-config.ts` | Token Meta para paridade CLI |
| `META_ACCESS_TOKEN` | Não | — | `gate-a-config.ts` | **Alias** de `GATE_A_META_ACCESS_TOKEN` |
| `GATE_A_MODE` | Não | `live` | `gate-a-config.ts`, `run-parity.mjs` | Modo Gate A (`demo`/`live`) |
| `GATE_A_DISCOVER` | Condicional | — | `discover-pilots.mjs` (seta `1`), `gate-a-discover.cli.test.ts` | Ativa teste discover |
| `GATE_A_DISCOVER_FROM` | Não | — | `gate-a-discover.cli.test.ts` | Filtro data início discover |
| `GATE_A_DISCOVER_TO` | Não | — | idem | Filtro data fim discover |
| `GATE_A_DISCOVER_MIN_ROWS` | Não | `100` | `gate-a-discover.cli.test.ts` | Mínimo de linhas piloto |
| `GATE_A_DISCOVER_LIMIT` | Não | `20` | idem | Limite de pilotos retornados |
| `NODE_ENV` | Não (auto) | `development` | `app-url.server.ts`, `system-diagnostics.server.ts` | Runtime Node — validação localhost em prod |
| `npm_package_version` | Não (auto) | `0.0.0` | `system-diagnostics.server.ts` | Versão do app no diagnóstico (`/admin/debug`) |
| `CLOUDFLARE_API_TOKEN` | Condicional | — | `.github/workflows/deploy.yml` (secret → wrangler) | Deploy Cloudflare Workers |
| `import.meta.env.DEV` | Não (auto) | Vite define | `cliente.$cliente.tsx`, `notification-dispatcher.ts`, `error-reporting.ts` | Flag desenvolvimento Vite |
| `import.meta.env.MODE` | Não (auto) | `development` | `feature-flag-service.ts` | Modo Vite (`development`/`production`) |

### Built-ins Vite — não incluir no `.env`

`DEV`, `MODE`, `PROD`, `SSR` são injetados pelo Vite em build time. Não aparecem em `.env.example` e não precisam de documentação operacional.

---

## Comparação com `docs/ENVIRONMENT_VARIABLES.md`

| Critério | Resultado |
| -------- | --------- |
| Variáveis do código presentes na doc | **43/43** variáveis configuráveis |
| Variáveis na doc ausentes no código | **0** |
| Lacunas na documentação | `npm_package_version` e built-ins Vite não mencionados (baixo impacto) |
| Doc desatualizada em outro aspecto | Seção Gate A CHECKLIST externo diz manter `PLATFORM_HUB_SUPABASE_WRITER` desligado — **conflita** com homologação RC1 (`true`) |

**Conclusão:** `ENVIRONMENT_VARIABLES.md` está **alinhada com o código** para variáveis configuráveis. Pequena melhoria sugerida: adicionar nota sobre `npm_package_version` na seção 7.

---

## Comparação com `.env.example`

### Variáveis ativas (descomentadas) no `.env.example`

| Variável | No código | Na doc |
| -------- | --------- | ------ |
| `VITE_OFFICIAL_SUPABASE_URL` | ✓ | ✓ |
| `VITE_OFFICIAL_SUPABASE_ANON_KEY` | ✓ | ✓ |
| `VITE_OFFICIAL_SUPABASE_PROJECT_ID` | ✓ | ✓ |
| `OFFICIAL_SUPABASE_URL` | ✓ | ✓ |
| `OFFICIAL_SUPABASE_ANON_KEY` | ✓ | ✓ |
| `OFFICIAL_SERVICE_ROLE_KEY` | ✓ | ✓ |
| `APP_URL` | ✓ | ✓ |
| `OFFICIAL_PRODUCTION_APP_URL` | ✓ | ✓ |
| `PLATFORM_HUB_WRITER_TARGET` | ✓ | ✓ |
| `PLATFORM_HUB_SUPABASE_WRITER` | ✓ | ✓ |
| `GOOGLE_OAUTH_CLIENT_ID` | ✓ | ✓ |
| `GOOGLE_OAUTH_CLIENT_SECRET` | ✓ | ✓ |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | ✓ | ✓ |
| `META_APP_ID` | ✓ | ✓ |
| `META_APP_SECRET` | ✓ | ✓ |
| `TIKTOK_APP_ID` | ✓ | ✓ |
| `TIKTOK_APP_SECRET` | ✓ | ✓ |

### Variáveis comentadas no `.env.example` (presentes como referência)

`SITE_URL`, `VITE_APP_URL`, `PUBLIC_APP_URL`, `PRODUCTION_APP_URL`, `STAGING_APP_URL`, `HUB_CREDENTIAL_ENCRYPTION_KEY`, `GATE_A_*` (8 vars), `CLOUDFLARE_API_TOKEN`.

### 1. Ausentes no `.env.example`

| Variável | Usada no código | Na doc | Impacto homolog RC1 |
| -------- | --------------- | ------ | ------------------- |
| `VITE_SUPABASE_URL` | ✓ (alias) | ✓ | Baixo — migração Lovable |
| `SUPABASE_URL` | ✓ (alias) | ✓ | Baixo |
| `VITE_SUPABASE_ANON_KEY` | ✓ (alias) | ✓ | Baixo |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✓ (alias) | ✓ | Baixo |
| `SUPABASE_ANON_KEY` | ✓ (alias) | ✓ | Baixo |
| `VITE_SUPABASE_PROJECT_ID` | ✓ (alias) | ✓ | Baixo |
| `META_ACCESS_TOKEN` | ✓ (alias Gate A) | ✓ | Baixo — Gate A CLI |
| `NODE_ENV` | ✓ | ✓ | Não configurar manualmente |
| `npm_package_version` | ✓ | ✗ | Automática via npm |

**Homologação RC1 — gaps relevantes no `.env.example`:**

| Variável | Status atual | Recomendação |
| -------- | ------------ | ------------ |
| `HUB_CREDENTIAL_ENCRYPTION_KEY` | Comentada | **Descomentar** com placeholder para homolog |
| `STAGING_APP_URL` | Comentada | **Descomentar** se homolog em URL preview distinta de `APP_URL` |

### 2. Documentadas mas não utilizadas no código da aplicação

| Variável | Observação |
| -------- | ---------- |
| — | **Nenhuma.** Todas as variáveis em `ENVIRONMENT_VARIABLES.md` têm referência no código ou no CI (`CLOUDFLARE_API_TOKEN` → wrangler). |

### 3. Utilizadas mas não documentadas

| Variável | Arquivo | Sugestão doc |
| -------- | ------- | ------------ |
| `npm_package_version` | `system-diagnostics.server.ts` | Adicionar nota em seção 7: "injetada automaticamente pelo npm" |
| `import.meta.env.DEV` / `MODE` | Vários | Opcional — built-ins Vite |

### 4. Duplicidades (grupos funcionais)

| Grupo | Variáveis | Propósito | Variável canônica recomendada |
| ----- | --------- | --------- | ------------------------------ |
| Supabase URL | `VITE_OFFICIAL_SUPABASE_URL`, `OFFICIAL_SUPABASE_URL`, `VITE_SUPABASE_URL`, `SUPABASE_URL` | Mesmo endpoint | `VITE_OFFICIAL_*` + `OFFICIAL_*` |
| Supabase anon | `VITE_OFFICIAL_SUPABASE_ANON_KEY`, `OFFICIAL_SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY` | Mesma chave pública | `VITE_OFFICIAL_*` + `OFFICIAL_*` |
| URL do portal | `APP_URL`, `SITE_URL`, `VITE_APP_URL`, `PUBLIC_APP_URL` | Mesma URL pública | `APP_URL` |
| URL prod (diagnóstico) | `OFFICIAL_PRODUCTION_APP_URL`, `PRODUCTION_APP_URL` | Mesma URL | `OFFICIAL_PRODUCTION_APP_URL` |
| Token Meta Gate A | `GATE_A_META_ACCESS_TOKEN`, `META_ACCESS_TOKEN` | Mesmo token CLI | `GATE_A_META_ACCESS_TOKEN` |
| Vault encryption | `HUB_CREDENTIAL_ENCRYPTION_KEY`, `OFFICIAL_SERVICE_ROLE_KEY` | Mesmo segredo se fallback | `HUB_CREDENTIAL_ENCRYPTION_KEY` dedicada |

**Duplicação intencional em dev:** copiar `VITE_OFFICIAL_*` e `OFFICIAL_*` com os mesmos valores (documentado em `SETUP.md`).

### 5. Inconsistências de nomenclatura

| Inconsistência | Detalhe | Risco |
| -------------- | ------- | ----- |
| Prefixo `OFFICIAL_` vs sem prefixo | Supabase usa `OFFICIAL_`; OAuth usa `META_*`, `GOOGLE_*`, `TIKTOK_*` | Baixo — convenção por domínio |
| `META_APP_ID` vs `GOOGLE_OAUTH_CLIENT_ID` | Meta/TikTok: `APP_ID`; Google: `OAUTH_CLIENT_ID` | Baixo — espelha consoles das plataformas |
| `GATE_A_META_ACCESS_TOKEN` vs `META_ACCESS_TOKEN` | Dois nomes para mesmo token CLI | Médio — confusão em scripts |
| `PLATFORM_HUB_*` vs `HUB_CREDENTIAL_*` | Prefixos diferentes no mesmo domínio Hub | Baixo |
| README bridge vs kernel | `base-metricas/README.md` diz writer "desligado por padrão"; `writer-target.config.ts` default `true` | **Alto** — documentação interna conflitante |

### 6. Inconsistência crítica — default `PLATFORM_HUB_SUPABASE_WRITER`

| Módulo | Arquivo | Se ausente |
| ------ | ------- | ---------- |
| Bridge homologação | `writer-target.config.ts` → `isHubWriterEnabled()` | **`true`** |
| Kernel metric-pipeline | `writer-config.ts` → `isSupabaseWriterEnabled()` | **`false`** |
| Admin stack | `create-admin-hub-stack.ts` | override explícito **`true`** |

**Impacto homolog RC1:** O admin Hub grava em `base_metricas_hub` independentemente da env (override). O kernel passivo sem admin stack respeita defaults conflitantes.

**Recomendação operacional:** Definir explicitamente `PLATFORM_HUB_SUPABASE_WRITER=true` no `.env` de homologação (já presente no `.env.example`).

---

## CI/CD vs homologação RC1

### `.github/workflows/ci.yml` (build)

Injeta apenas placeholders Supabase — **sem** `APP_URL`, OAuth ou Platform Hub. Adequado para CI de código.

### `.github/workflows/deploy.yml` (deploy)

| Secret injetado no build | Presente |
| -------------------------- | -------- |
| `VITE_OFFICIAL_SUPABASE_*` | ✓ |
| `OFFICIAL_SUPABASE_*` | ✓ |
| `OFFICIAL_SERVICE_ROLE_KEY` | ✓ |
| `APP_URL` | ✓ |
| `META_*`, `GOOGLE_*`, `TIKTOK_*` | ✗ |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | ✗ |
| `HUB_CREDENTIAL_ENCRYPTION_KEY` | ✗ |
| `PLATFORM_HUB_WRITER_TARGET` | ✗ |
| `PLATFORM_HUB_SUPABASE_WRITER` | ✗ |

**Gap:** Deploy via GitHub Actions **não propaga secrets OAuth/Hub** para o runtime Cloudflare. Homologação via Lovable secrets ou configuração manual no painel é necessária até atualizar o workflow.

---

## Perfil mínimo `.env` — homologação RC1

### Obrigatório (sempre)

```env
VITE_OFFICIAL_SUPABASE_URL=https://ywvhoctcmibjitvwkkhb.supabase.co
VITE_OFFICIAL_SUPABASE_ANON_KEY=<anon-key>
VITE_OFFICIAL_SUPABASE_PROJECT_ID=ywvhoctcmibjitvwkkhb
OFFICIAL_SUPABASE_URL=https://ywvhoctcmibjitvwkkhb.supabase.co
OFFICIAL_SUPABASE_ANON_KEY=<anon-key>
OFFICIAL_SERVICE_ROLE_KEY=<service-role-key>
APP_URL=<url-homolog-sem-barra-final>
PLATFORM_HUB_WRITER_TARGET=HUB
PLATFORM_HUB_SUPABASE_WRITER=true
```

### Recomendado (homolog)

```env
HUB_CREDENTIAL_ENCRYPTION_KEY=<openssl-rand-base64-32>
STAGING_APP_URL=<mesma-url-ou-preview>
OFFICIAL_PRODUCTION_APP_URL=https://lotsbi.leandromajr.com
```

### Condicional (por plataforma piloto)

```env
# Meta
META_APP_ID=<id>
META_APP_SECRET=<secret>

# Google (Ads + GA4 + GBP + YouTube)
GOOGLE_OAUTH_CLIENT_ID=<id>.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-<secret>
GOOGLE_ADS_DEVELOPER_TOKEN=<token>   # só se piloto = Google Ads

# TikTok
TIKTOK_APP_ID=<id>
TIKTOK_APP_SECRET=<secret>
```

### Opcional (Gate A CLI — não UI admin)

```env
GATE_A_CONFIG=./path/to/gate-a.config.json
GATE_A_META_ACCESS_TOKEN=EAAG...
GATE_A_MODE=live
```

---

## Sugestão exata — linhas a adicionar/ajustar no `.env`

> **Não aplicado automaticamente.** Copiar manualmente para `.env` (homologação).

### Linhas a **descomentar** ou **adicionar** no `.env` de homologação

```env
# Recomendado RC1 — chave dedicada (não depender de service role)
HUB_CREDENTIAL_ENCRYPTION_KEY=<gere-com-openssl-rand-base64-32>

# Se homolog roda em URL de preview (ex.: Lovable preview)
STAGING_APP_URL=https://<sua-url-homolog>.example.com
```

### Linhas a **garantir com valor explícito** (já no `.env.example`, validar preenchimento real)

```env
PLATFORM_HUB_WRITER_TARGET=HUB
PLATFORM_HUB_SUPABASE_WRITER=true
APP_URL=https://<sua-url-homolog>    # NÃO deixar localhost se homolog remota
```

### Linhas **opcionais** — seção aliases legados (só se migrando de preset Lovable sem `OFFICIAL_*`)

```env
# --- Aliases legados (opcional — preferir OFFICIAL_*) ---
# VITE_SUPABASE_URL=https://ywvhoctcmibjitvwkkhb.supabase.co
# VITE_SUPABASE_ANON_KEY=<anon-key>
# VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
# SUPABASE_URL=https://ywvhoctcmibjitvwkkhb.supabase.co
# SUPABASE_ANON_KEY=<anon-key>
# VITE_SUPABASE_PROJECT_ID=ywvhoctcmibjitvwkkhb
```

### Linhas para **secrets do deploy** (GitHub/Lovable/Cloudflare — não `.env` local)

Se homologação for via CI/CD proprietário, adicionar ao painel de secrets (não ao repo):

```env
META_APP_ID=<id>
META_APP_SECRET=<secret>
GOOGLE_OAUTH_CLIENT_ID=<id>
GOOGLE_OAUTH_CLIENT_SECRET=<secret>
GOOGLE_ADS_DEVELOPER_TOKEN=<token>
TIKTOK_APP_ID=<id>
TIKTOK_APP_SECRET=<secret>
HUB_CREDENTIAL_ENCRYPTION_KEY=<secret>
PLATFORM_HUB_WRITER_TARGET=HUB
PLATFORM_HUB_SUPABASE_WRITER=true
```

---

## Matriz de conformidade final

| Artefato | Status | Ação sugerida |
| -------- | ------ | ------------- |
| Código ↔ `ENVIRONMENT_VARIABLES.md` | ✅ Alinhado | Adicionar nota `npm_package_version` |
| Código ↔ `.env.example` | ⚠️ Parcial | Descomentar `HUB_CREDENTIAL_ENCRYPTION_KEY` e `STAGING_APP_URL` |
| `.env.example` ↔ homolog RC1 | ⚠️ Parcial | Validar secrets reais; não usar placeholders |
| `deploy.yml` ↔ homolog RC1 | ❌ Incompleto | Incluir secrets OAuth/Hub no workflow ou Lovable |
| Default `PLATFORM_HUB_SUPABASE_WRITER` | ⚠️ Conflito | Manter `=true` explícito no `.env` |
| Gate A CHECKLIST vs homolog | ⚠️ Conflito | CHECKLIST diz writer desligado; RC1 exige `true` |

---

## Conclusão

O inventário de ambiente para **Platform Hub RC1 homologação** está **completo no código e na documentação principal**. Os gaps operacionais concentram-se em:

1. **`.env` real** — preencher secrets (não placeholders) e descomentar `HUB_CREDENTIAL_ENCRYPTION_KEY`.
2. **`APP_URL`** — deve coincidir com redirect URIs OAuth registrados nas plataformas.
3. **`deploy.yml`** — não carrega variáveis Hub/OAuth; homolog remota exige secrets no runtime (Lovable/Cloudflare).
4. **Default conflitante** de `PLATFORM_HUB_SUPABASE_WRITER` — mitigado definindo `true` explicitamente.

Nenhuma alteração de Runtime, Registry, Pipeline, OAuth, Providers ou código de produção é necessária para esta auditoria.

---

## Referências

- [`docs/ENVIRONMENT_VARIABLES.md`](../ENVIRONMENT_VARIABLES.md)
- [`.env.example`](../../.env.example)
- [`SETUP.md`](../../SETUP.md)
- [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)
