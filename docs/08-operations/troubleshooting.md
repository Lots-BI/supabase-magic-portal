---
title: Troubleshooting
description: Guia de diagnóstico para problemas comuns — dados, auth, build e deploy.
status: living
owner: Engenharia / Ops Lots BI
last_review: 2026-09-11
---

# Troubleshooting

---

## Dashboard vazio / sem dados

### Sintomas

Cards zerados, gráficos flat, "—" nos KPIs.

### Checklist

1. **Usuário logado?** Sem JWT → redirect `/auth`
2. **Cliente vinculado?** Cliente precisa de row em `client_access`
3. **Dados ingeridos?** `/admin/debug` → `getDebugSnapshot`
4. **Nome do cliente bate?** Aliases em `cliente_aliases` (ADR-0004)
5. **Período correto?** Usar BRT — ver [period.md](../06-engine/period.md)
6. **View retorna rows?** `/admin/debug/views` → amostra por view

### Causas frequentes

| Causa                   | Solução                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| Make leftover parado (Google/GA4) | Esperado até OAuth Hub; Meta/IG devem vir do Hub |
| Hub sem `last_sync` / atraso > 2d | Puxar em `/admin/conexoes` ou `workflow_dispatch` do cron |
| Nome cliente divergente | Adicionar alias |
| `valor IS NULL` | Corrigir writer / pipeline |
| RLS / Make sem SELECT | Migration 54; views `security_invoker` (51) |

---

## `/admin` e Relatórios: timeout ou vazio

### Timeout (`canceling statement due to statement timeout`)

Causa histórica: `vw_overview_cliente` 8× UNION ALL. Correção: migration **56** +
`getAdminPortfolioFn`. Se o JS antigo estiver em cache, Ctrl+F5. Auditoria:
[overview-relatorios-timeout-audit.md](../reports/overview-relatorios-timeout-audit.md).

### Conversões = 0 com spend Meta preenchido

KPI = `meta_results + google_conversions + ga4_conversions` (migration **57**). GA4 Make
para em 2026-08-17 — janela 30d zera GA4. Não somar pixel Meta em cima de results.

### Overview vazio com Hub cheio

XOR `ph_metricas_source=make` escondia Hub. **Não** virar para `hub` (esconde Google/GA4).
A 54 faz prefer_hub **por dia** em `vw_metricas`.

---

## Hub atrasado (Meta/IG)

`max(data)` no Hub deve ser **ontem BRT** depois do cron (03:10 / 03:25 UTC). Se parou em
09-09: Actions → Run workflow dos crons, ou Puxar nas conexões com `last_sync` nulo.

---

## 401 Unauthorized em server function

| Causa              | Solução                                               |
| ------------------ | ----------------------------------------------------- |
| Sessão expirada    | Re-login em `/auth`                                   |
| Bearer não anexado | Verificar `attachSupabaseAuth` em `start.ts`          |
| Env server ausente | `OFFICIAL_SUPABASE_URL`, `OFFICIAL_SUPABASE_ANON_KEY` |

---

## 403 Forbidden (admin)

| Causa                    | Solução                                      |
| ------------------------ | -------------------------------------------- |
| Usuário sem role `admin` | Ver seção **Restaurar admin do dono** abaixo |
| Guard de rota            | Esperado — cliente não acessa `/admin`       |

### Restaurar admin do dono (`leandromajr@gmail.com`)

O dono da plataforma deve ter role `admin` permanente. Migration `09_owner_admin_guard.sql`
garante isso no banco (trigger + bootstrap).

**Opção A — SQL Editor (Supabase Dashboard):**

Execute o arquivo `supabase/migrations-official/09_owner_admin_guard.sql` inteiro.

**Opção B — script local (requer service-role no `.env`):**

```bash
npm run ensure:owner-admin
```

Depois: logout → login novamente em `/auth` para atualizar a sessão.

---

## Convite por e-mail aponta para localhost

### Sintomas

O botão do e-mail de convite (usuário ou admin) abre `http://localhost:...` em vez do portal em produção.

### Causa

O Supabase usa a **URL de redirecionamento** configurada no envio do convite. Sem `APP_URL` no servidor, o projeto pode cair no **Site URL** padrão do dashboard (muitas vezes `localhost` de dev).

### Correção

1. **Runtime do app (Vercel):** defina `APP_URL` com a URL pública, **sem barra no final**
   Ex.: `https://lotsbi.leandromajr.com`

2. **Supabase Dashboard → Authentication → URL Configuration:**
   - **Site URL:** mesma URL de produção (`APP_URL`)
   - **Redirect URLs:** inclua `{APP_URL}/auth/callback` (obrigatório v2.1) e `{APP_URL}/auth` (compat links legados). Dev: `http://localhost:5173/auth/callback`

3. **Templates de e-mail (Invite / Recovery):** links devem apontar para `/auth/callback` com `token_hash` e `type` — o Supabase injeta isso quando `redirectTo` está correto.

4. **Redeploy** após alterar secrets (o convite é gerado no servidor com `redirectTo`).

5. **Reenviar convite:** Admin → Usuários → **Gerenciar** → Recovery Mode → Reenviar convite.

   Se o usuário permanecer em `invite_pending` e nenhum e-mail for recebido, use o workaround
   oficial: **Excluir usuário** → recriar pelo painel admin. Ver
   [Known Operational Limitation — Recovery Mode (v3)](../03-backend/auth-module-v3.md#known-operational-limitation--recovery-mode-v3).

### Local

No `.env` local use `APP_URL=http://localhost:5173` para testar convites em dev.

---

## Build falha

```bash
npm ci
npm run build
```

| Erro comum            | Solução                                    |
| --------------------- | ------------------------------------------ |
| Env ausente no build  | Variáveis `VITE_OFFICIAL_*` no ambiente    |
| Plugin duplicado Vite | Não adicionar plugins já no preset Lovable |
| Tipos routeTree       | Regenerar com `npm run dev` uma vez        |

---

## Lint falha (CRLF)

Windows pode reportar `Delete ␍` do Prettier.

```bash
npm run format
```

Considerar `.gitattributes` com `eol=lf`.

---

## Login não funciona

1. Verificar `VITE_OFFICIAL_SUPABASE_URL` e `ANON_KEY`
2. Confirmar usuário existe no Supabase Auth dashboard
3. Signup desabilitado no Supabase? (config projeto)
4. Storage: limpar `localStorage` key `sb-{projectId}-auth-token`

---

## Métricas divergentes entre telas

1. Verificar se compara overview (`metrics.ts`) vs platform (`engine.ts`)
2. Reach: MAX vs SUM — ver [platform-catalog](../06-engine/platform-catalog.md)
3. Views SQL calculam CTR — engine recalcula — ver [metrics-model](../04-database/metrics-model.md)

---

## Recovery Mode — convite não reenviado (`invite_pending`)

### Sintomas

Usuário em lifecycle `invite_pending`; botão **Reenviar convite** executa sem erro, mas o e-mail não
chega (depende do estado interno OTP/Invite do Supabase Auth).

### O que funciona normalmente

Auth, convites na criação, login, logout, definição de senha e recuperação de senha.

### Workaround oficial

1. Admin → Usuários → **Gerenciar** → Recovery Mode → **Excluir usuário**
2. Admin → Usuários → **Novo usuário** — recriar com o mesmo e-mail
3. Novo convite enviado; fluxo completo até conta ativa

Não é necessário acessar o Dashboard do Supabase. Documentação completa:
[Known Operational Limitation — Recovery Mode (v3)](../03-backend/auth-module-v3.md#known-operational-limitation--recovery-mode-v3).

---

## Migrations

1. Aplicar em ordem numérica (`01` → `57`)
2. Cada migration tem bloco de validação no final
3. Idempotente — safe re-run
4. **View com colunas novas no meio:** use `DROP VIEW IF EXISTS` + `CREATE VIEW` (ver migration `05`)
5. **Migration 13 (`13_access_management.sql`):** necessária para lifecycle, auditoria persistente e Recovery Mode. Idempotente — aplicar no SQL Editor antes de usar gestão de acessos v2.1 em produção.
6. **Migration 17 (`17_fix_invalidate_sessions_uuid_cast.sql`):** obrigatória para Recovery Mode em produção se a migration 15 foi aplicada antes da correção de cast UUID.

Ver [Migrations](../04-database/migrations.md).

---

## `column vw_clientes_admin.<coluna> does not exist`

### Sintomas

Portal admin não carrega clientes; erro em `listClientes` ou páginas que dependem de `vw_clientes_admin`.

### Causa

O app pediu colunas (ex.: `tiktok_ativo`) que ainda não existem na view em produção — migration `05` não aplicada, ou view não recriada após `ALTER TABLE`.

### Solução

1. Aplicar `05_cadastro_clientes_make_ids.sql` completo no SQL Editor.
2. Se `CREATE OR REPLACE VIEW` falhar com `42P16`, use o script da migration corrigida (`DROP VIEW` + `CREATE VIEW`).
3. Validar colunas:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'vw_clientes_admin'
   ORDER BY ordinal_position;
   ```
4. O app usa `select("*")` em `listClientes` como compatibilidade; após migration 05, TikTok e IDs Make funcionam no cadastro.

---

## Erro `42P16` ao recriar view (`cannot change name of view column`)

Postgres interpreta colunas inseridas **no meio** da lista como rename. **Solução:** `DROP VIEW IF EXISTS public.vw_...` e em seguida `CREATE VIEW ...` (padrão adotado na migration `05`).

---

## Dashboard admin quebra com `AreaChartLotsLazy is not defined`

Gráfico de evolução em `/admin` sem import do componente lazy. Corrigido em `admin/index.tsx` — garantir deploy com import de `@/components/lots/charts/AreaChartLotsLazy`.

---

## Onde pedir ajuda

> ⚠️ **INFORMAÇÃO NÃO ENCONTRADA** — canais Slack/Discord, on-call e owners por área.

---

## Referências

- [Runbook](./runbook.md)
- [Observabilidade](./observability.md)
- [Auth](../03-backend/auth.md)
