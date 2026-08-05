# Platform Hub — Administração (SaaS)

Operações do Platform Hub pela interface administrativa `/admin/conexoes`, sem CLI, JSON ou `.env` para o operador.

## O que o administrador pode fazer

| Ação                     | Rota                            |
| ------------------------ | ------------------------------- |
| Visão geral e catálogo   | `/admin/conexoes`               |
| Nova conexão (wizard)    | `/admin/conexoes/nova`          |
| Detalhe da conexão       | `/admin/conexoes/:connectionId` |
| Painel Health            | `/admin/conexoes/health`        |
| Migração Make → Official | `/admin/conexoes/migracao`      |
| Homologação (dual-run)   | `/admin/conexoes/testing`         |
| Rollout por estágio      | `/admin/conexoes/rollout`         |
| Conexões por cliente     | Aba na ficha do cliente         |

## Catálogo de plataformas

O catálogo é **100% registry-driven**: lê `createHubRegistry()` e lista plugins, capabilities, providers e versões de API automaticamente. Novas plataformas aparecem sem alterar a UI.

## Fluxo de conexão (wizard)

1. Selecionar cliente (`cadastro_clientes`)
2. Selecionar plataforma (catálogo)
3. Escolher provider (`make_passive` ou `official_api`)
4. Autenticação: OAuth (Meta) ou credenciais (Credential Vault)
5. Identidades (ex.: Ad Account)
6. Teste + sincronização inicial

## OAuth (Meta, Google, TikTok)

- **Meta:** `/oauth/meta/callback` — `META_APP_ID`, `META_APP_SECRET`
- **Google** (Ads, GA4, Business, YouTube): `/oauth/google/callback` — `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`
- **TikTok:** `/oauth/tiktok/callback` — `TIKTOK_APP_ID`, `TIKTOK_APP_SECRET`

Início: botão OAuth no wizard ou reconectar na página da conexão. Tokens no **Credential Vault** (`ph_credentials`).

Variáveis de ambiente (infraestrutura): ver [ENVIRONMENT_VARIABLES.md](../ENVIRONMENT_VARIABLES.md).

## Persistência (`ph_*`)

Migration `28_platform_hub.sql`:

- `ph_connections` — conexões e campos admin (health, migration, coverage)
- `ph_identities` — contas/páginas vinculadas
- `ph_credentials` — vault criptografado
- `ph_sync_runs` — histórico de sync
- `ph_timeline_events` — auditoria visual
- `ph_oauth_states` — state OAuth temporário

## Diagnóstico

Na página da conexão, **Testar** executa checks: Registry, Provider, Credential Vault, Identity, Health, Pipeline (sem expor segredos).

## Migração Make → Official

Estágios: Make Passive → Paridade → Dual Run → Ready → Official Only → Make desligado.

Painel em `/admin/conexoes/migracao` com timeline por conexão.

## Integrações

- **Agency OS Central** — card de alertas de integrações
- **AI Workspace** — contexto via `formatPlatformHubMarkdown()` + registry report
- **Cliente** — seção Conexões Platform Hub na ficha

## Arquitetura (congelada)

A UI **não altera** Runtime, Pipeline, Registry, Health, Contracts ou Provider Framework. Consome `createAdminHubStack()` em `platform-hub-bridges/ph-persistence`.

## Limitações conhecidas / freeze (ago/2026)

- **Projeto Hub congelado** temporariamente — retomar via [manual-ops-checklist](../13-platform-hub/manual-ops-checklist.md)
- Dashboards client-facing: `ph_metricas_source.active_source = make` (não flipar sem Go)
- Sync automático: schedule no `hub-sync-official.yml` pronto; secrets GitHub ainda manuais
- Publish Facebook: código + botão **Reconectar + Publish**; Use Cases Meta manuais
- Meta Graph pode retornar `API access blocked` até desbloqueio no App Dashboard
- Documentação: aba [13-platform-hub/](../13-platform-hub/README.md)
