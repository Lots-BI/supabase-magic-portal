---
title: ADR-0025 — Métrica por cadastro_cliente_id e abertura multi-org
status: Aceito
date: 2026-10-21
---

# ADR-0025 — Métrica por cadastro_cliente_id e abertura multi-org

## Contexto

O Lots BI já tinha organizações, pedidos de acesso e RLS por tenant. A série
analítica ainda era o texto `cliente`. Duas agências com o mesmo nome de cliente
compartilhariam a unique do Hub e a leitura do dashboard. Checkout, NFS-e e
pagamento ficam com outro time e não entram nesta decisão.

## Decisão

1. `base_metricas_hub.cadastro_cliente_id` identifica o cliente. O texto
   `cliente` continua preenchido para o Make da Lots.
2. Unique do Hub: por cadastro quando o id existe; por nome só nas linhas
   legadas sem id.
3. Slug do cliente único por `organization_id`.
4. Pedido de acesso continua com aprovação da Lots. Dono de org opera clientes
   e convites da própria org, sem `user_roles.admin`.
5. Cofre de tokens exige `HUB_CREDENTIAL_ENCRYPTION_KEY`. Sem fallback para a
   service role.

## Alternativas consideradas

- Continuar bloqueando nome repetido entre orgs — quebra a campanha no primeiro
  homônimo.
- Prefixo no texto `cliente` — explode views e aliases.

## Consequências

### Positivas

- Duas organizações podem cadastrar "Padaria X".
- Gestor da org desativa cliente e reenvia convite.

### Negativas / dívidas

- Linhas Hub antigas sem id (zero após o backfill atual) cairiam no unique por
  nome.
- Make leftover da Lots ainda chaveia por nome.
- Checkout / NFS-e / `fin_*` continuam só da Lots.
