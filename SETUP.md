# Setup — Desenvolvimento Lots BI (interno)

Guia para rodar o portal **Lots BI** sem depender do editor Lovable. O código vive neste repositório;
Lovable permanece apenas como pipeline transitório de build/deploy até a Fase 6 do roadmap.

## Pré-requisitos

| Ferramenta | Versão                                    |
| ---------- | ----------------------------------------- |
| Node.js    | 22+ (ver `.nvmrc`)                        |
| npm        | 10+                                       |
| Git        | qualquer recente                          |
| Cursor     | ambiente oficial de engenharia (ADR-0010) |

## Primeira vez

```bash
cd lots-bi
npm run setup          # verifica Node e .env
npm install
cp .env.example .env   # Windows: copy .env.example .env
# Edite .env com as chaves do Supabase (Dashboard → Settings → API)
npm run dev
```

Abra `http://localhost:5173` (porta pode variar conforme o preset Vite).

## Variáveis de ambiente

Prefixo **`OFFICIAL_`** (não `SUPABASE_`) — exigência transitória do preset Lovable.

| Variável                    | Onde                                 |
| --------------------------- | ------------------------------------ |
| `VITE_OFFICIAL_SUPABASE_*`  | Browser (públicas)                   |
| `OFFICIAL_SUPABASE_*`       | Server functions                     |
| `OFFICIAL_SERVICE_ROLE_KEY` | **Somente servidor** — nunca `VITE_` |

Template completo: [`.env.example`](./.env.example)

## Comandos do dia a dia

| Comando           | Uso                                                |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Servidor local                                     |
| `npm run build`   | Build de produção                                  |
| `npm run preview` | Preview do build                                   |
| `npm run test`    | Testes (Vitest)                                    |
| `npm run lint`    | ESLint                                             |
| `npm run check`   | **Gate completo** — validate + lint + test + build |
| `npm run setup`   | Verificar ambiente local                           |

Antes de cada PR: **`npm run check`**.

## Fluxo de trabalho

```
Cursor → branch → commit → push → PR → CI (GitHub Actions) → merge → deploy
```

Detalhes: [CONTRIBUTING.md](./CONTRIBUTING.md) · [development-workflow.md](./docs/09-standards/development-workflow.md)

**Regra:** implemente **sempre** neste repositório. Não use o editor Lovable para features.

## Deploy

### Produção (hoje)

**Vercel** em [https://lotsbi.leandromajr.com](https://lotsbi.leandromajr.com). Merge em `main` publica.
Secrets Hub/OAuth/`APP_URL` no projeto Vercel.

Lovable ainda pode sincronizar o branch; **não** é o host do domínio real.

### Cloudflare (preparado, não é produção)

1. Secrets no GitHub: `CLOUDFLARE_API_TOKEN` + `OFFICIAL_*` / `VITE_OFFICIAL_*` + `APP_URL`
2. Actions → **Deploy (Cloudflare)** → confirmar com `deploy`
3. Local: `npm run build`; `npm run deploy:cloudflare`

Crons Hub: workflows `*-cron.yml` (secrets `APP_URL` + `CRON_SECRET`).

## Transição para stack 100% interna

| Fase                       | Status                  | Ação              |
| -------------------------- | ----------------------- | ----------------- |
| Dev no Cursor + Git        | ✅                      | ADR-0010          |
| CI lint/test/build         | ✅                      | ADR-0011          |
| Knowledge Center           | ✅                      | docs nativos      |
| Deploy GitHub → Cloudflare | 🟡 Manual, não é o domínio real | `deploy.yml` |
| Produção Vercel            | ✅ `lotsbi.leandromajr.com`     | merge `main` |
| Remover preset Lovable     | ⏳ Fase 6               | ADR-0012          |
| Desconectar Lovable        | ⏳ Após deploy validado | ops               |
| Horizons / leandromajr.com | ⏳ Futuro               | fora deste repo   |

Roadmap: [docs/11-roadmap/roadmap.md](./docs/11-roadmap/roadmap.md) · ADR: [0012](./docs/02-architecture/adr/0012-internal-infrastructure-transition.md)

## Documentação

- Entrada: [docs/START_HERE.md](./docs/START_HERE.md)
- Knowledge Center (admin): `/admin/knowledge`
- Onboarding dev: [docs/10-onboarding/onboarding.md](./docs/10-onboarding/onboarding.md)

## Problemas comuns

| Sintoma               | Solução                                                               |
| --------------------- | --------------------------------------------------------------------- |
| Build falha sem env   | Copie `.env.example` → `.env` ou use placeholders do CI               |
| Plugin Vite duplicado | Não adicione plugins já inclusos no preset Lovable (`vite.config.ts`) |
| Auth não funciona     | Verifique `VITE_OFFICIAL_*` no `.env`                                 |
| `npm run check` falha | Corrija lint/test antes do push                                       |

Mais: [docs/08-operations/troubleshooting.md](./docs/08-operations/troubleshooting.md)
