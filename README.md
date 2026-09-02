# Lots BI — Portal de performance e operação

Portal **Lots BI** (Lotus): dashboards multi-plataforma, painel administrativo, fluxo editorial/aprovações e **Platform Hub** para conexões oficiais (Meta, Google, TikTok).

- **Produção:** [lotsbi.leandromajr.com](https://lotsbi.leandromajr.com)
- **Repositório:** [Lots-BI/supabase-magic-portal](https://github.com/Lots-BI/supabase-magic-portal)
- **Stack:** TanStack Start · React · Supabase · Vite/Nitro · TypeScript

---

## O que é este projeto

| Área | Descrição |
| ---- | --------- |
| **Cliente** | Dashboards por marca (`/cliente/:slug`), plano estratégico, aprovações, publicações Instagram |
| **Admin** | Central operacional, clientes, usuários, conexões Platform Hub, relatórios |
| **Dados** | Supabase (`base_metricas`, views analíticas, `ig_media`, Platform Hub) |
| **Ingestão** | Make (perfil/diário) + APIs oficiais via Platform Hub (crescendo) |

Desenvolvimento oficial: **Cursor + Git** neste repositório. Lovable permanece transitório para build/deploy até cutover Cloudflare (ver [SETUP.md](./SETUP.md)).

---

## Início rápido

```bash
git clone https://github.com/Lots-BI/supabase-magic-portal.git
cd supabase-magic-portal
npm run setup
npm install
cp .env.example .env   # Windows: copy .env.example .env
# Preencha chaves Supabase + APP_URL + OAuth (Meta/Google) conforme necessário
npm run dev
```

Abra `http://localhost:5173` (ou a porta exibida no terminal).

Documentação completa: [`docs/START_HERE.md`](./docs/START_HERE.md) · setup local: [`SETUP.md`](./SETUP.md)

---

## Comandos principais

| Comando | Uso |
| ------- | --- |
| `npm run dev` | Servidor local |
| `npm run build` | Build de produção |
| `npm run test` | Testes (Vitest) |
| `npm run lint` | ESLint |
| `npm run check` | Gate completo (validate + lint + test + build) — **rodar antes do PR** |
| `npm run ig:gate-b` | Validação Instagram post-metrics (engenharia) |

---

## Estrutura do repositório

```
supabase-magic-portal/
├── docs/                    # Knowledge Center (fonte única de docs técnicas)
├── src/
│   ├── routes/              # TanStack Start — file-based routing
│   ├── components/lotus/    # UI do produto
│   ├── content/
│   │   ├── platform-tutorial/   # Tutorial admin + cliente
│   │   └── platform-news/       # Novidades visíveis ao cliente
│   └── modules/             # Domínios (platform-hub, approval, instagram-posts, …)
├── supabase/migrations-official/   # Migrations SQL (ordem numérica)
├── server/routes/           # API Nitro (ex.: cron Instagram)
└── .github/workflows/       # CI + deploy + cron (GitHub Actions)
```

---

## Variáveis de ambiente

Template: [`.env.example`](./.env.example) · referência: [`docs/ENVIRONMENT_VARIABLES.md`](./docs/ENVIRONMENT_VARIABLES.md)

| Grupo | Exemplos |
| ----- | -------- |
| Supabase | `VITE_OFFICIAL_SUPABASE_*`, `OFFICIAL_SERVICE_ROLE_KEY` |
| App | `APP_URL` (obrigatório em prod — OAuth e convites) |
| Platform Hub OAuth | `META_APP_ID`, `META_APP_SECRET`, `GOOGLE_OAUTH_*`, `TIKTOK_*` |
| Vault | `HUB_CREDENTIAL_ENCRYPTION_KEY` (recomendado prod) |

**Nunca** exponha `OFFICIAL_SERVICE_ROLE_KEY` com prefixo `VITE_`.

---

## Fluxo Git e deploy

```
branch → commit → push → PR → CI (GitHub Actions) → merge main → deploy
```

1. Trabalhe em branch (`feature/...`).
2. Antes do PR: `npm run check` (ou confie no CI se lint local falhar no Windows).
3. PR para `main` — CI roda lint, test, build.
4. **Deploy atual:** merge em `main` → pipeline Lovable/Vercel → `lotsbi.leandromajr.com`.
5. **Migrations:** aplicar SQL em `supabase/migrations-official/` no painel Supabase **antes** ou junto do deploy que depende delas.

Deploy alternativo (futuro): `npm run deploy:cloudflare` — ver [`SETUP.md`](./SETUP.md).

---

## Funcionalidades recentes (Instagram)

- **Publicações por post:** `/cliente/:slug/publicacoes` — Feed, Reels, Carrossel, Stories com métricas via Graph API.
- **Plugin Hub:** `instagram_organic` — OAuth Meta, sync manual, rota cron preparada.
- **Docs:** [`docs/06-dashboards/instagram-posts.md`](./docs/06-dashboards/instagram-posts.md) · setup Meta: [`docs/07-integrations/meta-instagram-setup.md`](./docs/07-integrations/meta-instagram-setup.md)

---

## Ajuda dentro do produto

| Público | Onde |
| ------- | ---- |
| **Admin — tutorial** | `/admin/tutorial` |
| **Admin — engenharia** | `/admin/knowledge` |
| **Cliente — tutorial** | `/tutorial` |
| **Cliente — novidades** | `/novidades` |

---

## Contribuição

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) (se existir) · padrões: [`docs/09-standards/`](./docs/09-standards/)
- Toda mudança visível ao usuário: atualizar **changelog**, **tutorial** e/ou **novidades** no mesmo PR.

---

## Licença

Projeto privado — Lots BI / Lotus. Uso interno e clientes autorizados.
