# Gate A — Relatório de Entrega (Meta Staging Paridade)

**Data:** 2026-07-08  
**Status:** Implementação operacional concluída — aguardando validação live com cliente piloto real  
**Escopo:** Gate A apenas — sem Gate B+

---

## 1. O que foi implementado

### Módulo operacional (`platform-hub-bridges/gate-a-meta-staging/`)

| Componente                        | Função                                                       |
| --------------------------------- | ------------------------------------------------------------ |
| `execute-gate-a-parity.ts`        | Orquestração completa do fluxo reproduzível                  |
| `create-gate-a-hub.ts`            | Composition root Gate A (memory writer, janela configurável) |
| `gate-a-config.ts`                | Validação de config JSON + overrides de env                  |
| `patch-official-meta-provider.ts` | Injeta FetchHttpClient (live) ou MockHttpClient (demo)       |
| `pilot-discovery.ts`              | Consulta read-only de candidatos em `base_metricas`          |
| `report/`                         | Export JSON, Markdown, CSV, métricas de cobertura            |
| `logging/gate-a-logger.ts`        | Log estruturado por etapa (JSONL)                            |

### Bridge auxiliar

- `registerCadastroRecord` em `legacy-cadastro` — permite mapear cliente piloto real sem migration

### Scripts npm

| Comando                               | Descrição                                       |
| ------------------------------------- | ----------------------------------------------- |
| `npm run gate-a:demo`                 | Fluxo completo com mocks (CI / onboarding)      |
| `npm run gate-a:parity -- --config=…` | Validação live com cliente Meta real            |
| `npm run gate-a:discover`             | Lista clientes Meta candidatos no baseline Make |

### Testes

- `gate-a-operational.test.ts` — fluxo demo automatizado
- `gate-a-live.cli.test.ts` — execução live via `GATE_A_CONFIG`
- `gate-a-discover.cli.test.ts` — descoberta de pilotos via `GATE_A_DISCOVER`

### Documentação

- `docs/RUNBOOK.md` — passo a passo para operadores
- `docs/CHECKLIST.md` — aprovação Gate A GO/NO-GO
- `fixtures/gate-a.config.example.json` — template de config

### O que **não** foi implementado (propositalmente)

- Migrations, UI, OAuth callback, escrita Supabase, alterações em Runtime/Pipeline/Registry/Health kernel

---

## 2. Como executar a validação passo a passo

```bash
cd lots-bi

# 1. Smoke test sem credenciais reais
npm run gate-a:demo

# 2. Descobrir cliente piloto
npm run gate-a:discover

# 3. Criar config (copiar example e preencher)
cp src/modules/platform-hub-bridges/gate-a-meta-staging/fixtures/gate-a.config.example.json ./meu-piloto.config.json

# 4. Configurar secrets (PowerShell)
$env:GATE_A_META_ACCESS_TOKEN = "EAAG..."
$env:OFFICIAL_SUPABASE_URL = "https://..."
$env:OFFICIAL_SERVICE_ROLE_KEY = "..."

# 5. Executar paridade
npm run gate-a:parity -- --config=./meu-piloto.config.json

# 6. Abrir relatório
# scripts/generated/gate-a-reports/<runId>/parity-summary.md
```

Detalhes: ver [RUNBOOK.md](./RUNBOOK.md).

---

## 3. Como escolher um cliente piloto

Execute `npm run gate-a:discover` e priorize clientes com:

1. **Alto volume** (`rows` na tabela de saída)
2. **Métricas core presentes** — colunas impressions, reach, clicks, spend > 0
3. **Cobertura temporal** — `min_data` / `max_data` cobrindo a janela desejada (≥ 7 dias)
4. **Campanhas ativas** — `campaigns` > 0
5. **Meta ativo via Make** — dados recentes em `base_metricas` com `plataforma = 'Meta Ads'`

Use o valor exato da coluna `cliente` como `pilot.canonicalClientName` no config.

---

## 4. Como interpretar o relatório de paridade

Arquivo principal: `parity-summary.md`

| Campo                            | Significado                                                 |
| -------------------------------- | ----------------------------------------------------------- |
| **Status APROVADO / DIVERGENTE** | Resultado consolidado Gate A                                |
| **Coverage geral**               | % de linhas baseline com match de valor (tolerância 0.0001) |
| **Linhas baseline / produzidas** | Volume Make vs Hub na janela                                |
| **Missing / Extra**              | Linhas só no Make ou só no Hub                              |
| **Value diffs**                  | Mesma chave, valores diferentes além da tolerância          |
| **Normalization diffs**          | Alias de métrica/plataforma ou whitespace em campanha       |
| **Métricas core (tabela)**       | Coverage por impressions, reach, clicks, spend              |

`parity-report.json` contém o payload completo para auditoria.  
`parity-diffs.csv` permite análise em planilha.

---

## 5. Como identificar divergências

1. **Abra `parity-diffs.csv`** — filtre por `kind=value` para deltas numéricos
2. **Verifique `top divergências`** no Markdown — maiores deltas primeiro
3. **Missing com métrica core** — Hub não coletou dado que Make tem
4. **Extra** — Hub produziu dado que Make não tem (mapper ou escopo)
5. **Normalization** — nomes equivalentes mas chaves diferentes (investigar mapper)
6. **Buracos de data** — seção de bloqueadores lista dias sem baseline ou produção

Ferramenta: `report/divergence-diagnostics.ts` — `buildDivergenceSummary`, `evaluateGateABlockers`.

---

## 6. Quais métricas são comparadas

### Métricas core (critério Gate A)

- `impressions`
- `reach`
- `clicks`
- `spend`

### Chave de comparação

`cliente + plataforma + data + metrica + campanha` (normalizada)

### Plataforma

`Meta Ads` (label gravado pelo OfficialMetaProvider — paridade com Make)

### Tolerância

- Valor absoluto: **0.0001** (spend em moeda, não micros)
- Coverage mínimo: **99%**

Todas as métricas presentes no baseline da janela entram no cálculo de coverage; as core têm critério adicional de zero missing.

---

## 7. Como realizar rollback

**Não aplicável em produção** — Gate A opera em modo observação:

- Memory writer apenas (sem `PLATFORM_HUB_SUPABASE_WRITER`)
- Baseline reader somente SELECT
- Nenhuma alteração em dashboards ou Make

Em caso de falha: **não avançar para Gate B**. Descarte o relatório e corrija config/token/cliente; reexecute.

---

## 8. O que ainda impede avançar para o Gate B

| Bloqueador                                                                  | Responsável |
| --------------------------------------------------------------------------- | ----------- |
| Validação **live** com ≥ 1 cliente piloto real ainda não executada/aprovada | Operação    |
| Relatório com coverage ≥ 99% e core metrics sem missing                     | Engenharia  |
| Assinatura CHECKLIST.md (engenharia + operação)                             | Gestão      |
| `npm run check` verde após merge desta entrega                              | Engenharia  |

Gate B (OAuth callback + vault operacional) **só inicia após Gate A GO documentado**.

---

## 9. Checklist completo de aprovação do Gate A

Ver [CHECKLIST.md](./CHECKLIST.md) — resumo:

- [ ] Demo local OK
- [ ] Piloto escolhido e config validado
- [ ] Paridade live executada
- [ ] Coverage ≥ 99%, core sem missing, zero value diffs
- [ ] Relatório arquivado
- [ ] Make intocado / Hub sem escrita prod
- [ ] Aprovação engenharia + operação

---

## 10. Riscos encontrados durante a implementação

| Risco                                       | Impacto               | Mitigação implementada                                             |
| ------------------------------------------- | --------------------- | ------------------------------------------------------------------ |
| Runtime padrão não passa `window` multi-dia | Coleta só "hoje"      | `createGateAHubStack` usa orchestrator bridge com janela do config |
| Cadastro in-memory só tinha `cadastro:42`   | Piloto real falharia  | `registerCadastroRecord` no bridge                                 |
| Token no JSON commitado                     | Vazamento             | `GATE_A_META_ACCESS_TOKEN` via env                                 |
| Demo ≠ live                                 | Falsa confiança       | Bloqueador explícito "modo demo" no relatório                      |
| Token Meta expira mid-run                   | Sync parcial          | Documentado no RUNBOOK; renovar e reexecutar                       |
| Nomes de campanha divergentes               | Normalization diffs   | Classificação em `normalizationDifferences`                        |
| Spend arredondamento                        | Value diffs marginais | Tolerância 0.0001 documentada                                      |
| Cliente baixo volume                        | Coverage instável     | `gate-a:discover` prioriza volume                                  |
| Query discovery carrega todas as rows       | Lentidão em DB grande | Filtros `GATE_A_DISCOVER_FROM/TO` opcionais                        |

### Decisão arquitetural documentada (sem alterar kernel)

Foi necessário um **composition root Gate A** (`createGateAHubStack`) fora do kernel para injetar janela de datas no orchestrator. O `createPlatformHubStack()` padrão não expõe window — alterar o kernel seria violação do Gate A. Solução: bridge layer apenas.

---

_Relatório gerado como parte da entrega Gate A. Make permanece origem oficial até Gate E (Meta cutover)._
