---
title: Conteúdos — calendário e produção
description: Criar no dia, escrever, produzir e publicar.
---

# Conteúdos (`/admin/aprovacoes`)

Escolha o cliente. A tela é **Fazer agora** + calendário + insights.

Os 9 status no banco continuam iguais. Na tela viram 5 selos: Ideia / Cliente / Peça / Cliente / No ar.

## Fazer agora

Cartazes cuja vez é da agência (`roteiro`, `alteracoes_*`, `aguardando_material`, `producao`). A barrinha acima da mídia (Escrever / Baixar / Editar) diz o que falta. Toque abre o workspace. Verde de baixo:

| Status                          | Verde                 |
| ------------------------------- | --------------------- |
| roteiro / alterações de roteiro | **Mandar ao cliente** |
| mídia enviada                   | **Começar peça**      |
| produção                        | **Pedir ok**          |

Em produção, o seletor de status e o botão **Mídia enviada** devolvem o card para `aguardando_material` a qualquer momento — não precisa ter pedido ok antes.

## Calendário

Toque no dia = criar (linha editorial, tema, **legenda** e horário). No Motorola, **+** no canto. O horário pode vir pré-preenchido pelos insights. Depois de criar, o roteiro e a legenda abrem em blocos grandes — no editor e no popup do card. Também nasce uma pasta na **Biblioteca** com a data e o título (`07/10 — …`).

A mídia que o cliente envia aparece no popup (abas Conteúdo e Arquivos) e nessa pasta. Um clique seleciona; dois cliques abrem. Selecione a pasta (ou os arquivos) e use **Download** — o browser pede o destino e baixa a pasta inteira.

## Insights (só admin)

Depois do cliente escolhido: top 7 pubs, frase com o melhor dia e a melhor faixa de horário (com média de interações e quantas publicações entraram na conta), barra vencedora destacada, selo da linha editorial do card. Pub sem card = selo vazio.

## Cliente

O cliente vê a fila **Sua vez** e a **Biblioteca** (upload livre). No roteiro, lê e edita o texto e a **legenda**; aprova com verde sem precisar gravar nada ainda. Só depois de aprovar é que a tela pede as mídias, pela câmera. Na peça final, o cliente vê só o preview do Instagram; para pedir ajuste, preenche **Pedir alterações** e toca em **Enviar alteração**.

## Ver como cliente

No topo do admin, **Ver como cliente** abre `/cliente/{slug}/aprovacoes` — a mesma tela que o cliente vê, com os mesmos cartazes e o mesmo roteiro. Com um cliente já selecionado em Conteúdos, o atalho vai direto para esse cliente, sem precisar buscar de novo. Um aviso no topo lembra que é só pré-visualização: os botões aparecem, mas nenhuma ação é registrada. **Voltar ao admin** retorna para `/admin/aprovacoes`.

## Rotas de workspace (por baixo)

- `/admin/aprovacoes/roteiro/$cardId`
- `/admin/aprovacoes/producao/$cardId`
- `/admin/aprovacoes/agendar/$cardId`
- Dashboard ops: `/admin/aprovacoes/dashboard`
