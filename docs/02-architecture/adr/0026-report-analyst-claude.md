---
title: ADR-0026 — Analista do relatório com Claude
status: Aceito
date: 2026-11-03
---

# ADR-0026 — Analista do relatório com Claude

## Contexto

O relatório operacional já mostra o recorte e aceita análise escrita à mão.
Faltava uma leitura curta dos mesmos números e um lugar para perguntar, sem
publicar a resposta sozinho e sem misturar com o AI Workspace (contexto de
engenharia, não de métrica).

## Decisão

1. A leitura do canvas e o prompt usam só `OperationalReport` mais os bullets
   de `buildInsights`. O modelo não recebe linha bruta, Make nem AI Workspace.
2. O chat vive em `/admin/analista` (aba dedicada). **Só admin** — `resolveIsAdmin`
   / `checkIsAdmin`. Cliente e operador de org não acessam a rota nem a server fn.
3. O relatório do cliente (`/cliente/{slug}/relatorio`) mantém a leitura automática
   (insights) e **não** expõe o chat.
4. O provedor é um `ReportAnalystPort` com adapter Anthropic (Claude Sonnet
   5.5, sobrescrevível por `REPORT_ANALYST_MODEL`). Não reutiliza `ContentAiPort`.
5. Sem `ANTHROPIC_API_KEY` a função devolve `not_configured`. A tela continua.
6. Cada admin tem 30 perguntas por cliente por dia BRT, em
   `report_analyst_usage`. `report_analyst_threads` guarda pergunta e resposta.
   RLS: só as próprias linhas.
7. "Usar na análise" injeta HTML no editor da própria aba e não envia.

## Alternativas consideradas

- Chamar o modelo no browser — a chave vazaria.
- Reusar o AI Workspace — o contexto não é o relatório.
- Chat no relatório do cliente — aberto demais nesta fase; fica admin-only.
- Um único port de conteúdo — o contrato de copy não é o de pergunta sobre métrica.
- Desligar o Make nesta entrega — Google Ads e GA4 ainda dependem dele; fica na fase humana.

## Consequências

### Positivas

- A leitura automática no relatório funciona sem a chave e sem o chat.
- A resposta fica ancorada no que o relatório já calculou.
- O limite diário e a auditoria ficam no banco, com RLS do usuário.
- Rollout controlado: só admin vê a aba.

### Negativas / dívidas

- Duas perguntas simultâneas podem passar do 30 se ambas lerem o contador antes de gravar.
- Sem a chave, o chat só explica que o analista não está ligado.
- A qualidade do contexto de Google Ads e GA4 continua dependente do pipeline atual (Make ou Hub).
- Abrir o chat para o cliente exige nova decisão (rota + gate).
