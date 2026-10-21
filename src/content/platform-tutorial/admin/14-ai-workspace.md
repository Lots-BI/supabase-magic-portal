---
title: AI Workspace — contexto para IAs
description: Dois geradores de contexto — Editor de Código e IA Conversacional. Somente Platform Owner.
---

# AI Workspace (`/admin/ai-workspace`)

O **AI Workspace** gera automaticamente o contexto da plataforma Lots BI para diferentes tipos de Inteligência Artificial. É exclusivo do **Platform Owner** — outros admins não veem esta aba.

## Para que serve

- Iniciar um chat novo (ChatGPT, Claude, Gemini, Perplexity) com contexto completo da plataforma
- Colar um Context Pack técnico no Cursor, Windsurf ou Copilot antes de codar
- Exportar markdown/JSON para compartilhar com a equipe ou agentes

**Não substitui** o Knowledge Center — apenas **sintetiza** docs, código, ADRs e roadmap.

## Dois geradores — qual usar?

| Gerador                             | Ideal para                          | Quando usar                                                    |
| ----------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| **Contexto para Editor de Código**  | Cursor, Windsurf, Copilot           | A IA vai escrever código, criar arquivos, implementar features |
| **Contexto para IA Conversacional** | ChatGPT, Claude, Gemini, Perplexity | Discutir ideias, auditar arquitetura, planejar, revisar        |

Na tela você verá **dois cards lado a lado** com “Ideal para” e “Use quando” em cada um.

## Passo a passo — Editor de Código

1. Menu **Ajuda** → **AI Workspace**
2. No card **Contexto para Editor de Código**, clique **Gerar Contexto**
3. Aguarde a agregação (alguns segundos)
4. Revise o preview — timestamp “Gerado em …” confirma a geração
5. **Copiar Markdown** ou **Exportar** (`lots-bi-code-context.md`)

Cole no início da sessão do seu editor de código com IA.

## Passo a passo — IA Conversacional

1. No card **Contexto para IA Conversacional**, clique **Gerar Contexto**
2. O documento inclui 14 seções em linguagem natural + **Como utilizar este contexto** no final
3. **Copiar Markdown** ou exporte como `lots-bi-chat-context.md`
4. Abra um chat **novo** no ChatGPT/Claude/etc.
5. Cole o documento como **primeira mensagem**
6. Na segunda mensagem, descreva apenas a tarefa (ex.: “Audite o módulo Approval”)

## Outros recursos na página

- **AI Context Completeness** — percentual de cobertura da documentação (8 critérios)
- **Busca** — encontra termos em módulos, ADRs, roadmap e no contexto gerado
- **Seções expansíveis** — visão geral, arquitetura, módulos, fluxos, banco, ADRs, roadmap, changelog

## Exportação

| Formato  | Arquivo típico                                             |
| -------- | ---------------------------------------------------------- |
| Markdown | `lots-bi-code-context.md` ou `lots-bi-chat-context.md`     |
| JSON     | `lots-bi-code-context.json` ou `lots-bi-chat-context.json` |
| Texto    | `lots-bi-chat-context.txt`                                 |

## Documentação técnica

Detalhes de arquitetura e fontes automáticas:

O gerador inclui o fluxo **Leitura dos dashboards** (templates, ranking e estrutura Meta) a partir de `docs/06-dashboards/dashboards.md`.

- [ai-workspace.md](../../../docs/06-dashboards/ai-workspace.md)
- [ai-chat-context.md](../../../docs/06-dashboards/ai-chat-context.md)

## Fim do tutorial admin

Você cobriu todas as abas do painel administrativo, incluindo Knowledge Center e AI Workspace. Para treinar **clientes finais**, indique o **Tutorial** no menu deles (`/tutorial`).
