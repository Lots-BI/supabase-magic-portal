# Platform Hub — Documentação operacional (auto)

> Gerado automaticamente em 2026-10-07T15:57:09.985Z · contract 1.0.0

## Rotas administrativas

| Rota | Função |
|------|--------|
| `/admin/conexoes` | Painel operacional |
| `/admin/conexoes/nova` | Assistente de conexão |
| `/admin/conexoes/:id` | Detalhe, credenciais, diagnóstico |
| `/admin/conexoes/health` | Health dashboard |
| `/admin/conexoes/migracao` | Migração Make → Official |

## Plataformas (Registry)

### example

- **Capabilities:** example:metrics:collect
- **Providers:** make_passive, official_api

**Fluxo operador:** Catálogo → Conectar → OAuth ou credenciais → Selecionar identidades → Sync.

### ga4

- **Capabilities:** ga4:metrics:collect
- **Providers:** make_passive, official_api

**Fluxo operador:** Catálogo → Conectar → OAuth ou credenciais → Selecionar identidades → Sync.

### google_ads

- **Capabilities:** google_ads:metrics:collect
- **Providers:** make_passive, official_api

**Fluxo operador:** Catálogo → Conectar → OAuth ou credenciais → Selecionar identidades → Sync.

### google_business

- **Capabilities:** gbp:metrics:collect
- **Providers:** make_passive, official_api

**Fluxo operador:** Catálogo → Conectar → OAuth ou credenciais → Selecionar identidades → Sync.

### instagram_organic

- **Capabilities:** instagram_organic:metrics:collect, instagram_organic:profile:collect, instagram_organic:content:publish, instagram_organic:crm:comments
- **Providers:** make_passive, official_api

**Fluxo operador:** Catálogo → Conectar → OAuth ou credenciais → Selecionar identidades → Sync.

### meta_ads

- **Capabilities:** meta:metrics:collect
- **Providers:** make_passive, official_api

**Fluxo operador:** Catálogo → Conectar → OAuth ou credenciais → Selecionar identidades → Sync.

### tiktok

- **Capabilities:** tiktok:metrics:collect
- **Providers:** make_passive, official_api

**Fluxo operador:** Catálogo → Conectar → OAuth ou credenciais → Selecionar identidades → Sync.

### youtube

- **Capabilities:** youtube:metrics:collect
- **Providers:** make_passive, official_api

**Fluxo operador:** Catálogo → Conectar → OAuth ou credenciais → Selecionar identidades → Sync.

## Estágios de migração

- `make_passive`
- `parity`
- `dual_run`
- `ready`
- `official_only`
- `make_off`
