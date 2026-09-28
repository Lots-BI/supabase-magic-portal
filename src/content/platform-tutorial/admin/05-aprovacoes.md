---
title: Conteúdos — calendário e produção
description: Criar no dia, escrever, produzir e publicar.
---

# Conteúdos (`/admin/aprovacoes`)

Escolha o cliente. A tela é **Fazer agora** + calendário + insights.

Os 9 status no banco continuam iguais. Na tela viram 5 selos: Ideia / Cliente / Peça / Cliente / No ar.

## Fazer agora

Cartazes cuja vez é da agência (`roteiro`, `alteracoes_*`, `aguardando_material`, `producao`). Toque abre o workspace. Verde de baixo:

| Status | Verde |
| ------ | ----- |
| roteiro / alterações de roteiro | **Mandar ao cliente** |
| material recebido | **Começar peça** |
| produção | **Pedir ok** |
| aprovado final | **Agendar** |

## Calendário

Toque no dia = criar (linha editorial + horário). No Motorola, **+** no canto. O horário pode vir pré-preenchido pelos insights.

## Insights (só admin)

Depois do cliente escolhido: top 7 pubs, frase com o melhor dia e a melhor faixa de horário (com média de interações e quantas publicações entraram na conta), barra vencedora destacada, selo da linha editorial do card. Pub sem card = selo vazio.

## Cliente

O cliente vê só a fila **Sua vez**. No roteiro, lê e edita numa janela grande (o mesmo editor do admin); aprova com verde sem precisar gravar nada ainda. Só depois de aprovar é que a tela pede as mídias, pela câmera.

## Ver como cliente

No topo do admin, **Ver como cliente** abre `/cliente/{slug}/aprovacoes` — a mesma tela que o cliente vê, com os mesmos cartazes e o mesmo roteiro. Com um cliente já selecionado em Conteúdos, o atalho vai direto para esse cliente, sem precisar buscar de novo. Um aviso no topo lembra que é só pré-visualização: os botões aparecem, mas nenhuma ação é registrada. **Voltar ao admin** retorna para `/admin/aprovacoes`.

## Rotas de workspace (por baixo)

- `/admin/aprovacoes/roteiro/$cardId`
- `/admin/aprovacoes/producao/$cardId`
- `/admin/aprovacoes/agendar/$cardId`
- Dashboard ops: `/admin/aprovacoes/dashboard`
