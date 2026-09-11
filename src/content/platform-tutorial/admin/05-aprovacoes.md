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

Depois do cliente escolhido: top 7 pubs, melhores dias e faixas de hora em Brasília, selo da linha editorial do card. Pub sem card = selo vazio.

## Cliente

O cliente vê só a fila **Sua vez**. Aprova com verde, pede mudança no âmbar, grava na câmera.

## Rotas de workspace (por baixo)

- `/admin/aprovacoes/roteiro/$cardId`
- `/admin/aprovacoes/producao/$cardId`
- `/admin/aprovacoes/agendar/$cardId`
- Dashboard ops: `/admin/aprovacoes/dashboard`
