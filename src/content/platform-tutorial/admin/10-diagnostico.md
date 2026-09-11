---
title: Diagnóstico — debug e auditoria
description: Painel operacional de ingestão e auditoria de views SQL.
---

# Diagnóstico

Ferramentas **técnicas e operacionais** para engenharia e admins experientes. Não são telas para o cliente final.

## Painel operacional (`/admin/debug`)

### Objetivo

Verificar se os **dados estão chegando** (Hub para Meta/Instagram; Make leftover para Google/GA4).

### Passo a passo

1. Abra **Diagnóstico → Painel operacional**.
2. Aguarde o snapshot carregar (`getDebugSnapshot`).
3. Para cada cliente, verifique:
   - **Última data recebida** — deve ser recente (1–2 dias de atraso máximo em operação normal)
   - **Contagem de registros** por plataforma
   - Amostra de linhas brutas (quando exibida)
4. Se vazio:
   - Volte em **Clientes** → integrações `configured`?
   - Token expirado? ID de conta errado?
   - Pipeline: Hub (crons GitHub Actions + Puxar) para Meta/IG; Make para Google/GA4 até OAuth.

### Quando usar

- Cliente reclama “dashboard zerado”
- Após configurar nova integração
- Pós-incidente de API Meta/Google

## Auditoria de views (`/admin/debug/views`)

### Objetivo

Validar que as **views SQL** (`vw_overview_cliente`, `vw_clientes_ativos`, etc.) respondem e respeitam **RLS** (Row Level Security).

### Passo a passo

1. Abra **Auditoria de views**.
2. A lista mostra cada view com status de segurança e amostra.
3. Clique em uma view para expandir:
   - Colunas retornadas
   - Política RLS aplicada
   - Erro se houver falha de permissão
4. Se uma view falhar para papel cliente, usuários finais verão dashboard vazio — corrija no Supabase antes de escalar.

### Quando usar

- Após migration nova no banco
- Antes de liberar acesso a cliente grande
- Debug de discrepância entre admin e cliente

## Relação com outras abas

| Sintoma                    | Ferramenta         | Correção                |
| -------------------------- | ------------------ | ----------------------- |
| KPI zerado                 | Painel operacional | Integrações em Clientes |
| Cliente vê menos que admin | Auditoria views    | RLS / client_access     |
| Dado antigo                | Painel operacional | Puxar Hub / cron / Make leftover |
| Visão geral timeout / vazia | Relatórios = mesma RPC | Ctrl+F5; ver troubleshooting KC |

## Próximo capítulo

**Branding** — personalizar identidade da plataforma.
