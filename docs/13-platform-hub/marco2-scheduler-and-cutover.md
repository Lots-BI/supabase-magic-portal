---
title: Marco 2 — Scheduler de métricas e cutover prep
description: Sync automático Official → base_metricas_hub e preparação do flip ph_metricas_source (sem aplicar até Go/No-Go).
status: living
owner: Engenharia Lots BI
tags: [platform-hub, marco-2, scheduler, cutover]
difficulty: intermediate
last_review: 2026-08-04
---

# Marco 2 — Scheduler + cutover prep

**Escopo deste marco**

| Entrega | Status |
|---------|--------|
| CLI de sync Official (`hub:sync-official`) | Pronto |
| Diagnóstico CLI (`hub:diagnose`) | Pronto |
| Cutover script com confirmação explícita | Pronto (default = dry-run) |
| Flip `active_source = hub` | **Bloqueado** até Go/No-Go do dual-run |

**Não confundir:** este scheduler coleta **métricas** (spend/clicks). Agendamento de **posts** é Marco 4.

---

## Sync automático

### Comandos

```bash
# Uma conexão
npm run hub:sync-official -- --connection=bb56230f-6a9d-4a32-a3f1-621b8f6c1d79

# Todas elegíveis: active + official_api + stage dual_run|ready|official_only|make_off
npm run hub:sync-official -- --eligible

# Só listar (não chama Meta / não grava)
npm run hub:sync-official -- --eligible --dry-run

# Diagnóstico (investigar warning)
npm run hub:diagnose -- --connection=bb56230f-6a9d-4a32-a3f1-621b8f6c1d79
```

### Variáveis

| Var | Uso |
|-----|-----|
| `OFFICIAL_SUPABASE_URL` + `OFFICIAL_SERVICE_ROLE_KEY` | Admin stack |
| `HUB_CREDENTIAL_ENCRYPTION_KEY` | Vault (leitura do token OAuth) |
| `META_APP_ID` / `META_APP_SECRET` | Validação / refresh Meta |
| `HUB_SYNC_ACTOR` | Opcional — aparece na timeline (default `scheduler:official`) |

### Cadência sugerida (ops)

- Dual-run: 1–2× / dia (alinhar com [checklist](./marco1-dual-run-checklist.md))
- Pós-cutover: a cada 4–6h ou conforme rate limit Meta

### Onde agendar

1. **Local / VM:** Task Scheduler (Windows) ou cron (Linux) chamando `npm run hub:sync-official -- --eligible`
2. **GitHub Actions:** workflow `hub-sync-official.yml` — `workflow_dispatch` + schedule opcional (requer secrets no repo)
3. **Futuro:** Cloudflare Worker / Supabase Cron (decisão CTO — ver [next-steps](./next-steps.md))

O workflow **não** flipa `ph_metricas_source`.

---

## Cutover prep (sem flip)

### Estado seguro

```bash
npm run hub:cutover
# Deve mostrar: active_source = make
```

### Quando houver Go

1. Confirmar KPIs no [checklist dual-run](./marco1-dual-run-checklist.md)
2. Comunicar ops + janela de monitoração
3. Aplicar:

```bash
npm run hub:cutover -- --to=hub --confirm=hub
```

4. Validar dashboards (`vw_metricas` → Hub)
5. Manter Make ligado como rollback por ≥48h

### Rollback

```bash
npm run hub:cutover -- --to=make --confirm=make
```

---

## Critérios Go do Marco 2 (eng)

- [x] Sync CLI equivalente ao botão Sync da UI
- [x] Script de cutover com `--confirm` obrigatório
- [ ] Cadência automática rodando no ambiente alvo (cron ou Actions)
- [ ] Dual-run Go assinado por ops
- [ ] Flip `hub` aplicado e monitorado (só após Go)
