# Gate A — Runbook Operacional (Meta Staging Paridade)

> **Modo:** observação apenas. Make continua sendo a única origem oficial em produção.  
> **Sem escrita** em `base_metricas` via Hub neste gate.

## Pré-requisitos

| Item                             | Obrigatório | Como obter                                        |
| -------------------------------- | ----------- | ------------------------------------------------- |
| Node.js ≥ 22                     | Sim         | `node -v`                                         |
| Dependências                     | Sim         | `npm install` na raiz de `lots-bi/` |
| Token Meta long-lived            | Sim (live)  | Facebook Developer → token com `ads_read`         |
| `OFFICIAL_SUPABASE_URL`          | Sim (live)  | `.env` local (read-only baseline)                 |
| `OFFICIAL_SERVICE_ROLE_KEY`      | Sim (live)  | `.env` local — **não commitar**                   |
| Cliente piloto com Meta via Make | Sim (live)  | `npm run gate-a:discover`                         |

## Fluxo reproduzível (checklist rápido)

```
1. npm run gate-a:discover          → escolher cliente piloto
2. Copiar fixtures/gate-a.config.example.json → meu-piloto.config.json
3. Preencher pilot, meta.adAccountId, window (≥ 7 dias)
4. export GATE_A_META_ACCESS_TOKEN=...   (não colocar token no JSON)
5. npm run gate-a:parity -- --config=./meu-piloto.config.json
6. Abrir scripts/generated/gate-a-reports/<runId>/parity-summary.md
```

## Passo a passo detalhado

### 1. Validar ambiente (demo, sem credenciais reais)

```bash
cd lots-bi
npm run gate-a:demo
```

Deve concluir com relatório em diretório temporário. Confirma que Runtime → Pipeline → Comparison funcionam.

### 2. Descobrir cliente piloto

```bash
# Opcional: restringir janela de análise
set GATE_A_DISCOVER_FROM=2026-07-01
set GATE_A_DISCOVER_TO=2026-07-07
npm run gate-a:discover
```

Escolha um cliente com:

- `rows` alto (volume suficiente)
- `impressions`, `reach`, `clicks`, `spend` > 0
- `min_data` / `max_data` cobrindo a janela desejada
- várias campanhas ativas (coluna `campaigns`)

O valor `cliente` na tabela é o **`canonicalClientName`** exato para o config.

### 3. Preparar config

Copie `fixtures/gate-a.config.example.json` e ajuste:

```json
{
  "pilot": {
    "label": "Nome legível do piloto",
    "cadastroId": 123,
    "canonicalClientName": "nome_exato_em_base_metricas"
  },
  "meta": {
    "adAccountId": "act_XXXXXXXXX"
  },
  "window": { "from": "2026-07-01", "to": "2026-07-07" }
}
```

### 4. Executar paridade live

**PowerShell:**

```powershell
$env:GATE_A_META_ACCESS_TOKEN = "EAAG..."
$env:OFFICIAL_SUPABASE_URL = "https://..."
$env:OFFICIAL_SERVICE_ROLE_KEY = "..."
npm run gate-a:parity -- --config=./meu-piloto.config.json
```

**Bash:**

```bash
export GATE_A_META_ACCESS_TOKEN="EAAG..."
npm run gate-a:parity -- --config=./meu-piloto.config.json
```

### 5. Artefatos gerados

Cada execução cria `scripts/generated/gate-a-reports/<runId>/`:

| Arquivo              | Conteúdo                     |
| -------------------- | ---------------------------- |
| `parity-summary.md`  | Relatório humano             |
| `parity-report.json` | Dados completos (CI/arquivo) |
| `parity-diffs.csv`   | Divergências exportáveis     |
| `gate-a-run.jsonl`   | Log estruturado por etapa    |

## O que acontece internamente (sem precisar ler ADRs)

1. **Select Connection** — cria conexão `meta_ads` + `official_api` in-memory
2. **Manual Sync** — `ManualScheduler` → `SyncRuntime`
3. **Official Provider** — Meta Graph API (token do vault)
4. **Runtime** — orquestra collect com janela do config
5. **Pipeline** — normaliza envelope
6. **Memory Writer** — snapshot in-memory (**não** grava Supabase)
7. **Baseline Reader** — SELECT read-only em `base_metricas` (Make)
8. **Comparison** — `compareMetrics` com tolerância 0.0001
9. **Coverage Report** — métricas core + buracos de data
10. **Relatório final** — Markdown + JSON + CSV

## Critérios de aprovação (Gate A GO)

- Coverage ≥ **99%**
- **0** missing nas métricas core: `impressions`, `reach`, `clicks`, `spend`
- **0** value diffs fora da tolerância
- Janela ≥ **7 dias** sem buracos críticos
- Relatório arquivado e revisado por engenharia + operação

## Rollback

Não aplicável em produção — Gate A é **somente leitura**.  
Falha = não avançar para Gate B. Nenhuma ação em dashboards ou Make.

## Troubleshooting

| Sintoma                             | Ação                                              |
| ----------------------------------- | ------------------------------------------------- |
| `Missing OFFICIAL_SUPABASE_URL`     | Configure `.env` com credenciais oficiais         |
| `Meta access token not found`       | Defina `GATE_A_META_ACCESS_TOKEN`                 |
| `window must cover at least 7 days` | Ajuste `from` / `to` no config                    |
| `Invalid OAuth token`               | Renove token Meta                                 |
| Coverage baixo                      | Verifique `canonicalClientName` e `adAccountId`   |
| Buracos de data                     | Confirme que Make populou todos os dias da janela |

## Referência

- Plano operacional: `platform_hub_rollout.plan.md` (Gate A)
- Módulo: `src/modules/platform-hub-bridges/gate-a-meta-staging/`
- Checklist: `docs/CHECKLIST.md`
