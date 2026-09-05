---
title: Clientes e integrações
description: Cadastro, slug, serviços, integrações Meta/Google/GA4 e workspace operacional.
---

# Clientes (`/admin/clientes`)

Tudo na plataforma gira em torno do **cadastro de cliente**. Sem cliente + integrações corretas, dashboards e relatórios ficam vazios.

## Lista de clientes (`/admin/clientes`)

| Coluna / info | Significado                              |
| ------------- | ---------------------------------------- |
| Nome          | Razão social ou nome fantasia            |
| Slug          | Identificador na URL (`/cliente/{slug}`) |
| Status        | Ativo, pausado, etc.                     |
| Plataformas   | Badges das integrações com dados         |

**Ações:** clique na linha para editar ou use **Novo cliente**.

## Criar cliente (`/admin/clientes/novo`)

Preencha passo a passo:

### Dados básicos

| Campo              | Como preencher                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| **Nome**           | Nome exibido em toda a plataforma                                                                      |
| **Slug**           | Automático a partir do nome; só letras minúsculas, hífens; **não mude** após go-live sem alinhar links |
| **Status**         | `ativo` para clientes em operação                                                                      |
| **CNPJ / contato** | Referência interna (conforme formulário)                                                               |

### Serviços contratados

Marque os serviços do catálogo (**Serviços**) que este cliente contrata — alimenta filtros na Central e relatórios operacionais.

Salve → você será redirecionado para a ficha do cliente.

## Editar cliente (`/admin/clientes/{id}`)

### Aba / seção Dados gerais

Atualize nome, status, observações. O sistema avisa se houver **alterações não salvas** ao sair (`useDirtyBlocker`) — salve antes de navegar.

### Integrações (parte crítica)

O formulário usa o catálogo `INTEGRATIONS` — cada plataforma tem campos técnicos específicos.

| Plataforma             | Campos típicos                 | Status                     |
| ---------------------- | ------------------------------ | -------------------------- |
| **Meta Ads**           | ID da conta de anúncios, token | configured / partial / off |
| **Google Ads**         | Customer ID, MCC               | configured / partial / off |
| **Google Analytics 4** | Property ID, credenciais       | configured / partial / off |
| **Instagram**          | Conta business vinculada       | configured / partial / off |
| **Google Business**    | Perfil/local                   | pre / off                  |

**Status explicado:**

- **configured** — pronto para ingestão
- **partial** — falta campo ou permissão
- **pre** — preparado mas sem sync
- **off** — desligado

### Passo a passo de integração Meta Ads

1. Obtenha o **ID da conta de anúncios** no Gerenciador de Anúncios.
2. Garanta que o token/serviço da agência tem permissão na conta.
3. Cole o ID no campo correspondente do cliente.
4. Salve — status deve ir para **configured**.
5. Aguarde próxima ingestão (ver **Painel operacional** em Debug).
6. Confira dados em `/cliente/{slug}/meta-ads`.

> **Coleta oficial (Platform Hub):** além do Make acima, é possível conectar o Meta Ads também
> em `/admin/conexoes/nova` (plugin `meta_ads`, identidade `ad_account`) para habilitar o botão
> **Puxar métricas** no dashboard — coleta direto da Marketing Insights API, sem depender do
> Make (dual-run, sem desligar o Make). Ver [meta-ads.md](../../../../docs/06-dashboards/platforms/meta-ads.md).

### Passo a passo Google Ads

1. Copie o **Customer ID** (formato XXX-XXX-XXXX).
2. Verifique vinculação ao MCC da agência.
3. Salve e valide em `/cliente/{slug}/google-ads`.

### Passo a passo GA4

1. Informe **Property ID** da propriedade GA4.
2. Confirme que a service account ou pipeline tem acesso de leitura.
3. Valide sessões no dashboard do cliente.

### Instagram

Vincule a conta business ao mesmo business do Meta Ads quando possível — alcance e engajamento alimentam o overview.

## Platform Hub — Conexões (`/admin/conexoes`)

> **Novo (RC1):** caminho proprietário para conectar APIs oficiais sem depender só do Make.

| Ação | Onde |
| ---- | ---- |
| Ver todas as conexões | `/admin/conexoes` |
| Nova conexão (wizard) | `/admin/conexoes/nova` |
| Detalhe, OAuth, sync | `/admin/conexoes/{id}` |
| Saúde global | `/admin/conexoes/health` |
| Homologação dual-run | `/admin/conexoes/testing` |

Na ficha do cliente (`/admin/clientes/{id}`), a seção **Conexões Platform Hub** lista conexões daquele cliente.

**Fluxo resumido:** Cliente → Plataforma → Provider `official_api` → OAuth ou credenciais → Identidades → Teste + Sync.

Documentação técnica: Knowledge Center → **Platform Hub** (`docs/13-platform-hub/`).

## Workspace Agency OS (`/admin/central/clientes/{id}`)

Atalho a partir da Central ou da ficha do cliente:

- Widgets de saúde, tarefas, notas
- Links rápidos para Aprovações e Plano Estratégico **já filtrados** neste cliente

## Vincular usuários

Depois de cadastrar o cliente, vá em **Usuários** e conceda `client_access` ao e-mail do cliente — ele verá só os dados da marca dele em `/dashboard`.

## Checklist de go-live

- [ ] Cliente criado com slug correto
- [ ] Serviços marcados
- [ ] Integrações em `configured`
- [ ] Ingestão com data recente (Debug)
- [ ] Usuário cliente criado com acesso
- [ ] Teste em `/cliente/{slug}` — KPIs populados
- [ ] Card de teste em Aprovações

## Próximo capítulo

**Usuários** — papéis, criação de conta e acessos.
