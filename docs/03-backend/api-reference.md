---
title: Backend — Referência de API (Server Functions)
description: Catálogo de todas as server functions, com auth exigida, input e retorno.
status: living
owner: Engenharia Lots BI
last_review: 2026-09-11
---

# Referência de API — Server Functions

> Todas as funções abaixo exigem o middleware `requireSupabaseAuth` (token Bearer válido).
> A coluna **Admin?** indica se a função chama `assertAdmin`/`isAdmin`.
> Inputs descritos no formato do Zod usado no código.

## Módulo: `admin.functions.ts`

### Papéis

#### `checkIsAdmin` — `GET`

- **Admin?** Não (apenas consulta o papel do próprio usuário).
- **Input:** nenhum.
- **Retorno:** `{ isAdmin: boolean }`.
- **Uso:** decide a navegação (admin vs cliente) no layout autenticado.

### Clientes

#### `listClientes` — `GET`

- **Admin?** Sim.
- **Input:** nenhum.
- **Retorno:** linhas de `vw_clientes_admin` ordenadas por `nome_cliente`.

#### `getCliente` — `GET`

- **Admin?** Sim.
- **Input:** `{ id: number (int) }`.
- **Retorno:** `{ cliente, servicos[], acessos[] }` (cadastro + serviços vinculados + acessos).

#### `checkSlugAvailable` — `POST`

- **Admin?** Sim.
- **Input:** `{ slug: string, excludeId?: number }`.
- **Retorno:** `{ available: boolean }`.

#### `createCliente` — `POST`

- **Admin?** Sim.
- **Input:** `clienteFields` (ver [tabela de campos](#campos-de-cliente-clientefields)).
- **Retorno:** linha criada de `cadastro_clientes`.
- **Erros:** `translatePgError` (ex.: "Este slug já está em uso por outro cliente.").

#### `updateCliente` — `POST`

- **Admin?** Sim.
- **Input:** `{ id: number } & Partial<clienteFields>`.
- **Retorno:** linha atualizada.

#### `toggleClienteAtivo` — `POST`

- **Admin?** Sim.
- **Input:** `{ id: number, ativo: boolean }`.
- **Retorno:** `{ ok: true }`.

#### `deactivateCliente` — `POST`

- **Admin?** Sim.
- **Input:** `{ id: number }`.
- **Retorno:** `{ ok: true }`.
- **Nota:** _soft delete_ (seta `ativo = false`). **Não existe DELETE físico de cliente.**

### Serviços

#### `listServicos` — `GET`

- **Admin?** Não (qualquer autenticado lê; RLS permite SELECT a todos).
- **Retorno:** todos os `servicos` ordenados por `nome`.

#### `upsertServico` — `POST`

- **Admin?** Sim.
- **Input:** `{ id?: uuid, nome: string, descricao?: string, ativo: boolean }`.
- **Retorno:** `{ ok: true }`.

#### `setClienteServicos` — `POST`

- **Admin?** Sim.
- **Input:** `{ cadastro_cliente_id: number, items: { servico_id: uuid, ativo: boolean, valor?: number, observacoes?: string }[] }`.
- **Comportamento:** reconcilia (desativa os ausentes, atualiza/insere os presentes).
- **Retorno:** `{ ok: true }`.

### Usuários & acessos

#### `listUsers` — `GET`

- **Admin?** Sim. Usa **service-role** (`auth.admin.listUsers`).
- **Retorno:** `{ id, email, created_at }[]` (até 200).

#### `listUsersWithRoles` — `GET`

- **Admin?** Sim. Usa **service-role**.
- **Retorno:** usuários enriquecidos com `is_admin`, `tipo`, `clientes[]`, `last_sign_in_at`.

#### `grantClientAccess` — `POST`

- **Admin?** Sim.
- **Input:** `{ user_id: uuid, cadastro_cliente_id: number }`.
- **Comportamento:** insere em `client_access` (ignora duplicado).
- **Retorno:** `{ ok: true }`.

#### `revokeClientAccess` — `POST`

- **Admin?** Sim.
- **Input:** `{ id: uuid }` (id da linha de `client_access`).
- **Retorno:** `{ ok: true }`.

#### `createUserAccount` — `POST`

- **Admin?** Sim. Usa **service-role**.
- **Input:** `{ email, nome?, tipo: "admin"|"cliente", mode: "invite"|"password", password?, cadastro_cliente_id? }`.
- **Comportamento:** convida por e-mail ou cria com senha; se `tipo=admin` insere em
  `user_roles`; se `cadastro_cliente_id` informado, concede `client_access`.
- **Retorno:** `{ user_id, invite_sent, temp_password }`.

### Diagnóstico

#### `getDebugSnapshot` — `GET`

- **Admin?** Sim.
- **Retorno:** contagens de `base_metricas`, últimas linhas, totais por plataforma, e amostra
  das views (lidas via client autenticado, pois dependem de `auth.uid()`).

#### `getViewsAudit` — `GET`

- **Admin?** Sim.
- **Retorno:** auditoria comparando contagem das views via service-role (espera 0) vs admin
  autenticado (espera dados), valores distintos de `base_metricas`, e o resultado de
  `current_user_clientes()` nos dois contextos. Alimenta `/admin/debug/views`.

---

## Módulo: `editorial.functions.ts`

#### `listPosts` — `GET`

- **Input:** `{ from: YYYY-MM-DD, to: YYYY-MM-DD, cadastro_cliente_id?, cliente_nome?, status? }`.
- **Retorno:** posts no intervalo (RLS filtra por acesso). Admin vê tudo; cliente só os seus.

#### `getPost` — `GET`

- **Input:** `{ id: uuid }`.
- **Retorno:** `{ post, revisions[] }`.

#### `createPost` — `POST`

- **Admin?** Sim.
- **Input:** `{ cadastro_cliente_id, data_publicacao, titulo, legenda?, plataforma="instagram", formato?, capa_url?, status="rascunho" }`.
- **Retorno:** post criado (com `cliente_nome` e `created_by` preenchidos).

#### `updatePost` — `POST`

- **Admin?** Sim.
- **Input:** `{ id } & Partial<postCreate sem cadastro_cliente_id>`.

#### `deletePost` — `POST`

- **Admin?** Sim.
- **Input:** `{ id: uuid }`. **DELETE físico** (posts podem ser apagados, clientes não).

#### `transitionPost` — `POST`

- **Admin?** Parcial — admin faz qualquer transição; cliente só aprova ou solicita alteração.
- **Input:** `{ id: uuid, action: "aprovar"|"solicitar_alteracao"|"set_status", status?, mensagem? }`.
- **Regras:**
  - `aprovar`: exige status atual `aguardando_aprovacao` → `aprovado`.
  - `solicitar_alteracao`: exige `mensagem` e status `aguardando_aprovacao` → `em_producao`.
  - `set_status`: só admin; move para qualquer status.
- **Efeito colateral:** registra uma linha em `post_revisions` (histórico).

#### `addPostComment` — `POST`

- **Input:** `{ id: uuid, mensagem: string }`. Insere comentário em `post_revisions`.

#### `countPostsAguardando` — `GET`

- **Retorno:** `{ count }` de posts em `aguardando_aprovacao` (badge).

---

## Módulo: `admin-portfolio.server.ts`

#### `getAdminPortfolioFn` — `GET`

- **Admin?** Sim (`resolveIsAdmin`).
- **Input:** `{ days: 7 | 30 | 90 }`.
- **Retorno:** `{ overview: OverviewRow[], clientesAtivos: PortfolioClienteAtivo[] }`.
- **Uso:** `/admin` e `/admin/relatorios`. Chama RPCs `portfolio_overview` e
  `portfolio_clientes_ativos` (migrations 56–57). **Não** faz SELECT PostgREST em
  `vw_overview_cliente` (timeout 8-union).

---

## Campos de cliente (`clienteFields`)

| Campo                                                                                                                                                                   | Tipo / regra                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `nome_cliente`                                                                                                                                                          | string 1–200, obrigatório                 |
| `slug`                                                                                                                                                                  | string 1–120, regex `^[a-z0-9-]+$`, único |
| `ativo`                                                                                                                                                                 | boolean (default `true`)                  |
| `empresa`, `email_principal`, `telefone`, `observacoes`                                                                                                                 | opcionais                                 |
| `google_ads_ativo`, `meta_ativo`, `ga4_ativo`, `google_business_ativo`                                                                                                  | flags `text` (compat Make)                |
| `instagram_ativo`, `tiktok_ativo`                                                                                                                                       | boolean                                   |
| `google_ads_customer_id`, `facebook_ad_account_id`, `instagram_username`, `instagram_page_id`, `ga4_property_id`, `google_business_location_id`, `tiktok_ad_account_id` | IDs técnicos (texto, opcionais)           |
| `mlabs_url`, `data_inicio`, `valor_mensal`                                                                                                                              | comerciais (opcionais)                    |

> **Sanitização:** strings vazias (`""`) são convertidas para `null` antes de gravar
> (`sanitizeClientePayload`).
