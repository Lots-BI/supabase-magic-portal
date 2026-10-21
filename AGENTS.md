<!-- LOTUS:BEGIN -->

> [!IMPORTANT]
> **Engenharia oficial Lots BI:** desenvolvimento no **Cursor** + repositório Git.
> **Setup local:** [SETUP.md](./SETUP.md) · `npm run setup`
> **Sistema de Engenharia:** `docs/00-company/engineering-system.md` · `npm run check`
>
> Fluxo: Cursor → Commit → GitHub → CI → Deploy → Portal Lots BI
>
> **Manual permanente deste arquivo:** leia o restante **no início de toda sessão**.
> Plano de ingestão (histórico): [docs/13-execution/AGENT-PLAN.md](docs/13-execution/AGENT-PLAN.md)
>
> **Transição interna:** Lovable e Horizons estão sendo desacoplados (ADR-0012).
> Implemente **sempre** neste repo — não no editor Lovable.
>
> Contribuir: [CONTRIBUTING.md](./CONTRIBUTING.md)

<!-- LOTUS:END -->

<!-- LOVABLE:BEGIN -->

> Build e deploy **não** passam mais pelo Lovable. Produção = Vercel (`push` em
> `main`). Continua **sem force-push** no histórico publicado.

<!-- LOVABLE:END -->

# Manual do agente Lots BI

Leia isto **antes de editar código**. Detalhe longo: `docs/START_HERE.md`.
Commit, push e deploy **só quando o humano pedir**.

## Onde trabalhar

| Item | Valor |
| --- | --- |
| Git / app | **esta pasta** `supabase-magic-portal/` (GitHub `Lots-BI/supabase-magic-portal`) |
| Wrapper local | `lots-portal/` — **não é git**. Tem `src/` e `package.json` velhos do Lovable |
| Produção | https://lotsbi.leandromajr.com (Vercel, merge/`push` em `main`) |
| Supabase | projeto `ywvhoctcmibjitvwkkhb` (sa-east-1) |
| Dono admin | `leandromajr@gmail.com` (role permanente) |
| Node | 24 (`.nvmrc`) |
| Shell | PowerShell: use `;` — **nunca** `&&`. Sem `tail`. Commit via `-F` arquivo, não here-string frágil |

**Nunca** rode `npm run dev` / edite `src/` na raiz `lots-portal`. Sobe outro app e a sessão aparece como **Cliente**.

Nesta máquina Windows, o Vite precisa de:

```powershell
cd "<repo>/supabase-magic-portal"   # ou esta pasta, se o Cursor já abriu o git
$env:NAPI_RS_FORCE_WASI="1"
npm run dev -- --port 8080 --host 127.0.0.1 --strictPort
```

Local: http://127.0.0.1:8080 — login `/auth` — admin `/admin`. O admin entra pela **conta**, não pelo URL. Se o menu mostrar Cliente: logout e entre com `leandromajr@gmail.com`. Restaurar papel: `npm run ensure:owner-admin`.

## Nunca faça

- Force-push, `--no-verify`, `git config`, amend de commit já enviado, rebase de `main`
- Commitar `.env`, `.env.*`, service role, tokens. Stage: `git add --all -- ":!.env" ":!.env.*"`
- Prefixar `OFFICIAL_SERVICE_ROLE_KEY` com `VITE_`
- `toISOString().slice(0,10)` para “hoje” — use `src/lib/period.ts` / `America/Sao_Paulo`
- Mudar o ciclo de Conteúdos (status machine) sem pedido explícito
- Writer Hub escrever `base_metricas_make`
- Drop de `base_metricas_make`
- Implementar no editor Lovable
- Plugins Vite já inclusos no preset (`vite.config.ts`)
- Editar `src/routeTree.gen.ts` na mão

## Comandos (cwd = este repo)

```powershell
npm run setup              # checa Node + .env
npm run dev                # local (porta 8080 neste PC)
npm run check              # gate = CI: validate + lint + test + build  (antes de PR)
npm run lint
npm run test               # Vitest
npm run test:watch
npm run build              # o que a Vercel roda
npm run format
npm run ensure:owner-admin # dono vira admin de novo
npm run hub:doctor
```

Feature nova: **branch a partir de `main`**, nome `feat/…` ou `fix/…`. Não desenvolver direto na `main` salvo o humano pedir publicação imediata.

## Git → GitHub → Vercel

```
Cursor → branch → commit (se pedido) → push → PR → CI → merge main → Vercel publica
```

Produção **é** `git push origin main` (ou merge fast-forward na `main` + push). A Vercel (projeto `lots-bi/supabase-magic-portal`) publica sozinha. Cloudflare `deploy.yml` é manual e **não** é o domínio real. Lovable só sincroniza o branch.

Quando o humano pedir **commit / push / entrar em produção**:

1. `git status`, `git diff`, `git log -8 --oneline`, `git branch -vv` — cwd deste repo.
2. Confirmar migrations do código **já aplicadas** no Supabase (MCP `list_migrations` / SQL). Código que lê coluna inexistente derruba produção.
3. Lint dos arquivos alterados + `npm run build`. Testes do recorte. `npm run check` antes de PR.
4. Commit **sem** `.env`. Mensagem em 1–2 frases no **porquê** (pt ou en, estilo do `git log`).
5. Se estiver em feature: `git checkout main; git pull --ff-only origin main; git merge --ff-only <branch>; git push origin main` (e `git push -u origin <branch>` se a feature ainda não foi). Se já estiver na `main`: `git pull --ff-only origin main; git push origin main`.
6. Acompanhar deploy Production no GitHub até `success`. Confirmar no site no ar.
7. Devolver o que ainda depende do humano (secrets, Meta, etc.).

`gh` neste PC pode não estar logado; `git push` via HTTPS costuma funcionar. Sem `gh`, não inventar PR — use push + dizer ao humano para abrir no GitHub, ou peça `gh auth login`.

PRs: template `.github/pull_request_template.md`. Docs no **mesmo** PR se o comportamento mudou (`docs/` + `last_review` + changelog se visível ao usuário).

## Banco

- DDL = MCP `apply_migration` **e** arquivo `supabase/migrations-official/NN_*.sql` (aditivo, idempotente).
- Views novas: colunas só no **fim**. Prefer_hub: sentinela campanha `''` + results/conversions 0 **não** esconde Make (migration 47).
- Google Ads spend no storage = **micros** (mapper ÷ 1e6, writer × 1e6, view dashboard ÷ 1e6).
- Coleta ads/perfil: até **ontem BRT**. Recoleta substitui o dia.
- Env: prefixo `OFFICIAL_` / `VITE_OFFICIAL_` (não `SUPABASE_`). Service role só servidor.

## Arquitetura (não negociável)

- Fonte única de verdade; fórmulas só em `src/lib/platforms/formulas.ts`
- Nova plataforma = `PlatformDef` + registry; UI não calcula regra de negócio
- Fluxo Conteúdos: `UI → server fn → module service → repository → Supabase`. Só `*.repository.server.ts` fala com o client Supabase em `modules/approval/`
- Auth: RLS + Zod + `requireSupabaseAuth`; `resolveIsAdmin` / owner-admin; service-role em `.server.ts`
- Hub: `prefer_hub` nas 4 (Meta Ads, IG perfil, Google Ads, GA4). Make = histórico. Labels de plataforma **idênticos** ao Make
- Publicação Instagram agendada = cron `conteudos-publish-due` (5 min). Stub Graph `schedule()` não vira projeto
- Verificar UI no browser (fluxo real, não só screenshot). Rotas que compartilham estado também

## Módulos e rotas

| Área | Código | Admin | Cliente |
| --- | --- | --- | --- |
| Conteúdos | `src/modules/approval/` | `/admin/aprovacoes` | `/cliente/{slug}/aprovacoes` |
| CRM | `src/modules/crm/` | `/admin/crm` | `/cliente/{slug}/crm` |
| Relatórios | `src/modules/operational-report/` | `/admin/relatorios` | `/cliente/{slug}/relatorio` |
| Hub / conexões | `src/modules/platform-hub/` | `/admin/conexoes` | — |
| Dashboards | `src/modules/{meta-ads,ga4,…}` | via cliente | `/cliente/{slug}/meta-ads` etc. |
| Access / users | `src/modules/access/`, `admin/` | `/admin/usuarios` | — |
| Knowledge | `docs/` + rotas | `/admin/knowledge` | — |

Ciclo Conteúdos (não alterar sem pedido):

`roteiro → aguardando_aprovacao → aguardando_material → producao → aguardando_aprovacao_final → agendado → publicado`

Admin pode `producao` / `alteracoes_design` → `aguardando_material`. Cliente não.

## Definition of Done

- [ ] `npm run lint` (arquivos tocados) e `npm run build` passam
- [ ] Tipagem limpa; sem mortos / TODOs esquecidos
- [ ] Reusou engine/componentes existentes
- [ ] `docs/` no mesmo trabalho se comportamento mudou; ADR se decisão estrutural; changelog se visível
- [ ] Migration aplicada no banco **e** no repo
- [ ] UI conferida no browser se mexeu em tela

## Referências

| Assunto | Arquivo |
| --- | --- |
| Entrada humana | `docs/START_HERE.md` |
| Setup | `SETUP.md` |
| Fluxo / DoD | `docs/09-standards/development-workflow.md` |
| Deploy | `docs/08-operations/deployment.md` · `docs/08-operations/cicd.md` |
| Troubleshooting / admin | `docs/08-operations/troubleshooting.md` |
| Env | `docs/ENVIRONMENT_VARIABLES.md` · `.env.example` |
| Plano Hub (histórico) | `docs/13-execution/AGENT-PLAN.md` |
| Regras Cursor | `.cursor/rules/*.mdc` |
