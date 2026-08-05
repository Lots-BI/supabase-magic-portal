---
title: Checklist manual — fim do plano Hub (bloqueadores humanos)
description: Documento único do que precisa ser feito manualmente ao final do plano Platform Hub / piloto Meta. Código e automação já preparados.
status: living
owner: Engenharia / Ops Lots BI
tags: [platform-hub, ops, checklist, manual]
difficulty: beginner
last_review: 2026-08-05
---

# Checklist manual — fim do plano (Hub Meta)

> **Projeto congelado (ago/2026).** Execute estes itens só quando for **descongelar** o Hub.  
> Branch no GitHub: `feature/marco1-hub-meta-piloto` (código salvo; sem cutover / sem deploy prod).

Use este arquivo **só no final** (ou quando um passo humano for impossibilitante extremo).  
Engenharia já deixou código, migrations, workflow e botões prontos. **Make permanece fonte dos dashboards** até o Go/No-Go (item M5).

**Não faça cutover** (`active_source = hub`) sem completar o dual-run e assinar M5.

---

## Por que existe este checklist?

| Área | O que a máquina já fez | O que só humano faz |
|------|------------------------|---------------------|
| Métricas Hub | Writer idempotente, índice único, janela 7 dias, CLIs | Desbloquear Graph Meta se `API access blocked` |
| Publish Facebook | Botão **Reconectar + Publish**, scopes opt-in | Use Cases no App Dashboard + consentimento OAuth no browser |
| Scheduler | Cron no `hub-sync-official.yml` + `.cmd` Windows | `gh auth` + secrets no GitHub (ou Task Scheduler na sua máquina) |
| Cutover | CLI `hub:cutover` com `--confirm` | Decisão ops após 1–2 semanas de dual-run |

---

## Checklist (marque na ordem)

### M0 — Desbloquear Meta Graph (`API access blocked`)

- [ ok ] Abrir [Meta for Developers](https://developers.facebook.com/) → app cujo App ID = `META_APP_ID` do `.env`
- [ ] Confirmar app em Development **ou** Live conforme o piloto
- [ ] Conta usada no OAuth está em **App roles** (Admin / Developer / Tester)
- [ ] Marketing API / permissões de Ads disponíveis para o app
- [ ] Validar: no repo `npm run hub:sync-official -- --connection=37ebe453-f60f-4375-a6b7-97229f87050f` termina sem `API access blocked`

**Por quê:** sem Graph, sync Hub e refresh de métricas falham. Make continua ok.

---

### M1 — Use Case de Page (Publish)

- [ ] Dashboard do app → Use Case **Manage everything on your Page** (criar se não existir)
- [ ] Em Customize, garantir: `pages_show_list` e `pages_manage_posts`
- [ ] (Opcional) `instagram_content_publish` só se for publicar no Instagram depois

**Por quê:** sem isso o Facebook recusa scopes de publish (**Invalid Scopes**) e o Connect de métricas também pode quebrar se forem misturados no dialog padrão.

Doc Meta: [Customize Manage everything on your Page](https://developers.facebook.com/docs/pages-api/create-an-app/).

---

### M2 — Roles no app Meta

- [ ] Adicionar como Admin/Dev/Tester a conta Facebook que administra a **Page** da Agência Lots
- [ ] Essa conta é a que vai clicar **Reconectar + Publish** no portal

**Por quê:** em Development, só roles do app conseguem conceder permissões e publicar.

---

### M3 — GitHub Actions (scheduler automático)

- [ ] No PC: `gh auth login` (este ambiente estava sem login)
- [ ] Repo → **Settings → Secrets and variables → Actions** → criar:
  - `OFFICIAL_SUPABASE_URL`
  - `OFFICIAL_SERVICE_ROLE_KEY`
  - `HUB_CREDENTIAL_ENCRYPTION_KEY`
  - `META_APP_ID`
  - `META_APP_SECRET`
- [ ] **Actions → Hub Sync Official → Run workflow** → mode `dry-run`
- [ ] Depois mode `eligible` e conferir sync no Hub / timeline da conexão
- [ ] Confirmar que o schedule `0 11,23 * * *` (08:00 e 20:00 BRT) está ativo no branch default

**Alternativa local (O1):** Task Scheduler apontando para `scripts/ops/hub-sync-eligible.cmd`.

**Por quê:** o YAML já tem cron; sem secrets o job falha. Não altera Make nem `ph_metricas_source`.

---

### M4 — Reconectar OAuth com Publish (1 clique)

- [ ] Portal → `/admin/conexoes` → Meta piloto
- [ ] Clicar **Reconectar + Publish** (não o “Reconectar OAuth” padrão)
- [ ] Aceitar **todas** as permissões de Page no Facebook
- [ ] Confirmar identity **Page** na conexão
- [ ] Teste: card Facebook **Aprovado** + imagem → **Publicar no Facebook**

**Por quê:** o Connect padrão só pede métricas (de propósito). Publish é opt-in para não quebrar login antes de M1.

---

### M5 — Go/No-Go cutover (só no fim do dual-run)

- [ ] Preencher KPIs em [marco1-dual-run-checklist](./marco1-dual-run-checklist.md)
- [ ] Scheduler (M3 ou O1) rodando estável
- [ ] Divergência Hub vs Make dentro do limiar acordado
- [ ] Comunicar ops + janela de monitoração
- [ ] `npm run hub:cutover -- --to=hub --confirm=hub`
- [ ] Validar dashboards; manter Make ≥48h para rollback

**Rollback:** `npm run hub:cutover -- --to=make --confirm=make`

**Por quê:** cutover troca a fonte dos dashboards. É decisão de produto, não passo de código.

---

## Opcional

| ID | Item | Quando |
|----|------|--------|
| O1 | Task Scheduler Windows (`scripts/ops/hub-sync-eligible.cmd`) | Se não quiser Actions |
| O2 | App Review / Advanced Access Meta | Publish para usuários fora do app (clientes) |
| O3 | Secrets Hub no deploy Cloudflare | `deploy.yml` já mapeia vars; preencher secrets no GitHub + garantir runtime Cloudflare |
| O4 | `git push` desta branch / abrir PR | Quando quiser remoto / review |

---

## Referências rápidas

| Tema | Doc / comando |
|------|----------------|
| Piloto dual-run | [marco1-dual-run-checklist](./marco1-dual-run-checklist.md) |
| Scheduler + cutover | [marco2-scheduler-and-cutover](./marco2-scheduler-and-cutover.md) |
| Publish Meta | [marco4-publish-meta](./marco4-publish-meta.md) |
| Sync CLI | `npm run hub:sync-official -- --eligible` |
| Diagnóstico | `npm run hub:diagnose -- --connection=<uuid>` |
| Comparar dia Hub vs Make | `node scripts/engineering/hub-compare-metricas-day.mjs "Agência Lots" "YYYY-MM-DD"` |

---

## Estado esperado antes deste checklist

- Dual-run ativo; `ph_metricas_source.active_source = make`
- Hub grava só em `base_metricas_hub` (sem duplicar na mesma chave natural)
- Painel Make / Meta Ads 04/08 alinhado (ex.: 740 impressões) quando Graph estiver ok
- Botão **Reconectar + Publish** e workflow com schedule já no código
