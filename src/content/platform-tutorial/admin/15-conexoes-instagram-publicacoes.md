---
title: Conexões Instagram e Publicações
description: Conectar instagram_organic no Platform Hub, OAuth Meta e dashboard por post.
---

# Conexões Instagram e Publicações (`/admin/conexoes`)

Guia operacional para entregar **métricas por publicação** (Feed, Reels, Carrossel, Stories) aos clientes via API oficial Meta.

## Pré-requisitos

| Item | Onde |
| ---- | ---- |
| App Meta (Facebook Login) | [developers.facebook.com](https://developers.facebook.com/) |
| Redirect OAuth | `{APP_URL}/oauth/meta/callback` |
| Env vars | `META_APP_ID`, `META_APP_SECRET`, `APP_URL` |
| Conta Instagram | **Business ou Creator** vinculada a uma **Página Facebook** |

Documentação técnica: Knowledge Center → **Instagram posts** e **Meta setup** (`docs/06-dashboards/instagram-posts.md`).

## Nova conexão — passo a passo

1. **Conexões** → **Nova conexão** (`/admin/conexoes/nova`).
2. **Cliente** — selecione a marca.
3. **Plataforma** — escolha **Instagram orgânico** (`instagram_organic`).
4. **Provider** — `official_api` (API oficial).
5. **Autenticação** — **Conectar com Meta** (abre popup; conclua login e permissões).
6. **Identidades** — marque o perfil **Instagram** (tipo `instagram`) como principal.
7. **Teste** — **Sincronizar agora** para validar coleta.

Após o OAuth, se a etapa 4 aparecer vazia, recarregue a página — o assistente restaura a conexão pela URL.

## Alternativa: o cliente conecta sozinho

O cliente também pode fazer essa conexão sem depender do admin, em
`/cliente/{slug}/conexoes` (aba **Conexões** no menu dele). O fluxo é o mesmo OAuth Meta, só que
restrito a **instagram_organic** e escopado ao próprio cadastro do cliente (não aparece seletor
de cliente nem de plataforma/provider — sempre `official_api`).

- Server functions dedicadas em `src/modules/platform-hub-client/hub-client.server.ts`
  (`createClientInstagramConnectionFn`, `startClientInstagramOAuthFn`,
  `discoverClientInstagramIdentitiesFn`, `attachClientInstagramIdentityFn`), todas checando
  `assertClientPortalAccess` (ou admin) antes de qualquer operação.
- Plugins liberados para autoatendimento ficam em
  `CLIENT_SELF_SERVICE_PLUGIN_KEY` — hoje só `instagram_organic`. Expandir essa constante (e a
  UI em `ClientConnectionsPage.tsx`) quando outra plataforma for validada para o cliente.
- `sanitizeOAuthRedirectAfter` foi estendido para aceitar `/cliente/{slug}/conexoes` (além dos
  paths `/admin/conexoes/*`).
- Continua existindo a via admin acima — útil para suporte, ou quando o cliente não tem acesso
  de administrador da Página no Meta Business.

## O que o cliente vê

| Rota | Conteúdo |
| ---- | -------- |
| `/cliente/{slug}/publicacoes` | Grid de posts com thumbnail e métricas |
| Botão **Puxar métricas** | Sync manual (cooldown ~5 min) |

O menu **Publicações** só aparece se Instagram estiver ativo para a marca.

## Sync e manutenção

| Ação | Onde |
| ---- | ---- |
| Sync por conexão | Ficha em `/admin/conexoes/{id}` → Sincronizar |
| Sync pelo cliente | `/cliente/{slug}/publicacoes` → Puxar métricas |
| Sync automático diário | **Pendente** — GitHub Actions após merge (ver docs) |

## Troubleshooting

| Sintoma | Causa provável | Ação |
| ------- | -------------- | ---- |
| Etapa identidades vazia após OAuth | Sessão perdida / pluginKey | Recarregar URL com `connectionId` e `step=4` |
| Erro `#100` na listagem | Token sem Ads (normal no IG orgânico) | Já corrigido — só páginas + perfis IG |
| Nenhuma identidade | Página sem IG Business | Vincular IG à Page no Meta Business |
| Publicações vazias | Identidade não marcada ou sync não rodou | Vincular perfil + sincronizar |

## Checklist go-live Instagram posts

- [ ] Migration `33_instagram_media_metrics` aplicada no Supabase
- [ ] `META_*` e `APP_URL` em produção (Vercel)
- [ ] Conexão `instagram_organic` ativa com identidade `instagram` primária
- [ ] Teste em `/cliente/{slug}/publicacoes`
- [ ] Novidade publicada em `/novidades` (arquivo `src/content/platform-news/releases.ts`)

## Próximo capítulo

Consulte **Knowledge Center** para arquitetura Platform Hub e changelog de engenharia.
