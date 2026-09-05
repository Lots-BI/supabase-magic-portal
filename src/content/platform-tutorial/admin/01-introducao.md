---
title: Introdução — painel administrativo
description: Como navegar no painel admin, entender papéis e o mapa completo de abas.
---

# Introdução ao painel administrativo

Este tutorial explica **cada aba** do painel admin da plataforma Lots BI, passo a passo: o que você vê, o que preencher, como integrar dados e qual fluxo seguir no dia a dia.

## Para quem é este guia

- **Administradores da agência** — gestão de clientes, conteúdo, usuários, relatórios e operação.
- **Donos da plataforma** — acesso total, incluindo branding e diagnóstico.

Se você é **cliente final** (marca contratante), use o tutorial em **Tutorial** no menu lateral do painel cliente (`/tutorial`).

## Como entrar no painel admin

1. Acesse a URL da plataforma e faça login com e-mail e senha.
2. Se seu usuário tem papel **admin**, o menu lateral mostra as seções **Operações**, **Diagnóstico**, **Plataforma** e **Ajuda**.
3. Rotas que começam com `/admin` são **bloqueadas** para usuários sem papel admin — você será redirecionado para `/dashboard`.

## Mapa completo das abas (menu lateral)

| Grupo       | Aba                    | Rota                       | O que faz                                                           |
| ----------- | ---------------------- | -------------------------- | ------------------------------------------------------------------- |
| Operações   | **Central**            | `/admin/central`           | Cockpit operacional Agency OS: briefing, feed, prioridades, kanbans |
| Operações   | **Visão geral**        | `/admin`                   | Dashboard executivo — KPIs do portfólio inteiro                     |
| Operações   | **Relatórios**         | `/admin/relatorios`        | Hub para relatório executivo e relatórios por cliente               |
| Operações   | **Aprovações**         | `/admin/aprovacoes`        | Content Workflow — produção e aprovação de conteúdo                 |
| Operações   | **Plano Estratégico**  | `/admin/plano-estrategico` | Centro de inteligência estratégica por cliente                      |
| Operações   | **Clientes**           | `/admin/clientes`          | Cadastro, integrações e workspace do cliente                        |
| Operações   | **Usuários**           | `/admin/usuarios`          | Contas, papéis e acessos vinculados                                 |
| Operações   | **Serviços**           | `/admin/servicos`          | Catálogo de serviços contratados                                    |
| Diagnóstico | **Painel operacional** | `/admin/debug`             | Amostra de ingestão e saúde técnica                                 |
| Diagnóstico | **Auditoria de views** | `/admin/debug/views`       | Auditoria de views SQL e RLS                                        |
| Plataforma  | **Branding**           | `/admin/branding`          | Nome, cores e identidade visual                                     |
| Ajuda       | **Tutorial**           | `/admin/tutorial`          | Este guia passo a passo                                             |
| Ajuda       | **Knowledge Center**   | `/admin/knowledge`         | Documentação técnica interna (engenharia)                           |
| Ajuda       | **AI Workspace**       | `/admin/ai-workspace`      | Context Pack para IAs — **somente Platform Owner**                  |

## Elementos comuns em todas as telas

### Barra superior

- **Busca global (`Ctrl+K` / `⌘K`)** — atalhos para rotas, clientes, comandos Agency OS e glossário.
- **Central de notificações** — alertas locais da sessão.
- **Impersonar cliente** (somente admin) — visualizar a plataforma como um cliente específico.
- **Sair** — encerra a sessão com segurança.

### Período de análise

Nas telas de métricas (Visão geral, Relatórios, dashboards de cliente), use o seletor de período:

- Presets: **7, 30 ou 90 dias** (e outros conforme a tela).
- O delta (seta verde/vermelha) compara com a **janela anterior de mesmo tamanho**.
- Fuso horário oficial: **America/Sao_Paulo**.

### Tooltips de métricas

Passe o mouse no ícone **ℹ** ao lado dos KPIs para ver a definição oficial (CTR, CPA, CPC, etc.). Os números vêm das **views** do banco — não são calculados manualmente na interface.

## Ordem recomendada de leitura

1. **Central** — se você opera o dia a dia da agência.
2. **Clientes + integrações** — antes de qualquer dashboard fazer sentido.
3. **Aprovações** — fluxo de conteúdo.
4. **Visão geral** e **Relatórios** — leitura de performance.
5. Demais abas conforme sua função.

## Próximo capítulo

Continue em **Central** para aprender o cockpit operacional Agency OS.
