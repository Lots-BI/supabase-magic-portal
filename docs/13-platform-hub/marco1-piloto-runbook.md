---
title: Marco 1 — Runbook operacional (Conexões Meta)
description: Passo a passo para ops conectar Meta Ads piloto, sync e o que fazer quando algo falha.
status: living
owner: Engenharia / Ops Lots BI
tags: [platform-hub, marco-1, runbook]
difficulty: beginner
last_review: 2026-08-04
---

# Runbook — Conexões Meta (Marco 1)

Uma página. Objetivo: **ops conecta Meta sem engenharia no meio**.

## Antes de começar

1. App em `supabase-magic-portal` · `npm run dev` · abrir `http://localhost:8080`
2. Login admin (`leandromajr@gmail.com`)
3. `.env` com `META_APP_ID`, `META_APP_SECRET`, `APP_URL=http://localhost:8080`, `HUB_CREDENTIAL_ENCRYPTION_KEY`
4. App Meta Developer: redirect `http://localhost:8080/oauth/meta/callback`
5. `npm run hub:doctor` → ALL PASS
6. Cliente piloto escolhido (já tem dados no Make)

## Fluxo feliz

1. `/admin/conexoes` → **Conectar Meta Ads** (ou Nova conexão)
2. Cliente piloto → plataforma **Meta Ads** → provider **Official API**
3. **Conectar com Meta Ads** (OAuth) → autorizar
4. Escolher **Ad Account** (moeda/fuso iguais ao Make)
5. **Sincronizar agora**
6. Abrir a conexão → **Diagnóstico** → verde
7. Confirmar métricas no Testing Center vs Make

## Se der vermelho

| Sintoma | O que fazer |
|---------|-------------|
| “OAuth Meta não configurado” | Preencher `META_*` no `.env`, reiniciar `npm run dev` |
| Redirect OAuth falha | Conferir `APP_URL` e URL no app Meta (sem barra final no APP_URL) |
| Sem identidades | Reconectar OAuth; permissões do app Meta; usuário com acesso ao Ad Account |
| Sync falha / 0 rows | Identity errada; token; Diagnóstico; ver `lastError` na conexão |
| Token morreu no meio do piloto | **Reconectar OAuth** na conexão; anotar no checklist dual-run |
| Divergência alta vs Make | Não cutover; anotar métricas; abrir com engenharia |

## Cadência do piloto

- Sync manual **1–2× por dia** (dono nomeado no checklist)
- Dashboards de cliente **continuam no Make** até Go de cutover
- Não alterar `ph_metricas_source` sem Go/No-Go

## Links úteis

- [Checklist dual-run / KPIs / Go-No-Go](./marco1-dual-run-checklist.md)
- [Guia de homologação](./homologation-guide.md)
- Testing Center: `/admin/conexoes/testing`
