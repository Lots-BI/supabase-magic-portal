---
title: Checklist de tarefas automáticas
description: Ações do admin e do cliente que podem virar uma linha na planilha de Tarefas, com aba, prazo e proprietário.
status: living
owner: Produto Lots BI
last_review: 2026-10-03
---

# Checklist de tarefas automáticas

Cada item abaixo pode nascer sozinho na planilha de Tarefas. A linha usa sempre os mesmos campos:

| Campo | O que a automação preenche |
| ----- | -------------------------- |
| Tarefa | A ação, no imperativo |
| Cliente | O cadastro da marca |
| Proprietário | Quem deve fazer. No admin, alguém da agência. No cliente, o usuário daquela conta |
| Entrega | A data que dispara o prazo. Publicação mais próxima, fim do período ou o dia da recorrência |
| Status | Aberta ao criar. Entregue quando a ação some do sistema |
| Aba | Para onde o botão da linha leva |
| Repete | Só quando a ação volta todo período |

Uma tarefa de um cliente não aparece para outro. O cliente vê a própria entrega mais próxima, só para leitura. O admin edita a linha só com a caixinha daquela tarefa marcada.

Este documento é o checklist do que **pode** ser automatizado. A planilha manual, a repetição semanal e o aviso do proprietário no dia da entrega já existem. A criação sozinha destas linhas ainda não.

---

# Admin

Aba no painel: Conteúdos (`/admin/aprovacoes`), CRM (`/admin/crm`), Relatório (`/admin/relatorios`), Diretrizes da Marca (`/admin/brandbook`) e Conexões (`/admin/conexoes`).

## Conteúdos

- [ ] **Escrever o roteiro.** Card em `roteiro`. Entrega = data de publicação do card. Aba Conteúdos.
- [ ] **Ajustar o roteiro.** Card em `alteracoes_roteiro`, depois que o cliente devolveu. Entrega = data de publicação do card. Aba Conteúdos.
- [ ] **Baixar o material recebido.** Card em `aguardando_material` com o checklist `material_recebido` concluído. Entrega = data de publicação do card. Aba Conteúdos.
- [ ] **Montar a peça.** Card em `producao`. Entrega = data de publicação do card. Aba Conteúdos.
- [ ] **Ajustar o design.** Card em `alteracoes_design`. Entrega = data de publicação do card. Aba Conteúdos.
- [ ] **Aprovar conteúdos.** Há card aguardando a agência ou a fila do dia tem publicação próxima sem peça pronta. Cliente = marca do card. Proprietário = responsável da conta. Entrega = data de publicação mais próxima. Status Aberta. Aba Conteúdos.
- [ ] **Conferir o que vai ao ar.** Card em `agendado` cuja publicação é hoje ou a mais próxima. Entrega = data e hora de publicação. Aba Conteúdos.
- [ ] **Republicar ou arquivar falha.** Job de publicação (`conteudos-publish-due`) falhou. Entrega = hoje. Aba Conteúdos.

## CRM

- [ ] **Responder a caixa de entrada.** Pessoa com sinal inbound ainda sem `brand_reply` no recorte de 7, 30 ou 90 dias. Entrega = hoje, ou o dia seguinte se chegou fora do expediente. Aba CRM.
- [ ] **Atender intenção alta.** Score de intenção ≥ 70 no mesmo dia, sem tarefa aberta para aquela pessoa. Entrega = hoje. Aba CRM.
- [ ] **Olhar quem está em risco.** Aba Em risco do CRM com pessoa sem contato no recorte. Entrega = fim do recorte (7, 30 ou 90 dias). Aba CRM.
- [ ] **Puxar o Instagram.** Comentários ou Direct do cliente sem sync no dia. Entrega = hoje. Aba CRM.

## Relatório

- [ ] **Revisar o relatório do período.** Cliente ativo no fim de 7, 30 ou 90 dias. Entrega = último dia do recorte. Aba Relatório.
- [ ] **Cobrir conta sem sync.** Conta do portfólio sem ingestão há mais de 48 horas. Entrega = hoje. Aba Relatório, e a conexão em si fica em Conexões.
- [ ] **Explicar queda de resultado.** CPA do cliente subiu 40% ou mais contra o período anterior na visão geral. Entrega = hoje. Aba Relatório.

## Diretrizes da Marca

- [ ] **Cobrar diretrizes que não chegaram.** Cliente ativo sem PDF de diretrizes. Entrega = data combinada com o cliente, ou 7 dias após o início do contrato se não houver data. Aba Diretrizes da Marca.
- [ ] **Atualizar diretrizes vencidas.** Arquivo enviado e depois marcado para revisão. Entrega = data da revisão. Aba Diretrizes da Marca.

## Conexões

- [ ] **Conectar a rede que falta.** Cliente ativo sem conexão de Instagram, Meta Ads, Google Ads, GA4, Google Business ou TikTok que o contrato prevê. Entrega = hoje. Aba Conexões.
- [ ] **Resolver conexão com falha.** Saúde da conexão em falha no painel. Entrega = hoje. Aba Conexões.
- [ ] **Renovar o acesso.** Token da conexão perto de expirar ou pedindo login de novo. Entrega = o dia anterior ao vencimento. Aba Conexões.

## Períodos que se repetem

Estas linhas usam **Repete**. Ao marcar Entregue, a data avança para a próxima ocorrência e a tarefa continua Aberta.

- [ ] **Toda segunda-feira — fila da semana.** Proprietário = responsável da conta. Entrega = a segunda mais próxima. Aba Conteúdos.
- [ ] **Toda segunda-feira — caixa do CRM.** Mesma regra de data. Aba CRM.
- [ ] **Todo dia 1 — relatório do mês.** Entrega = dia 1. Aba Relatório.
- [ ] **Todo dia da publicação — o que vai ao ar.** Não é um dia fixo da semana: a entrega é a data de publicação mais próxima daquele cliente. Aba Conteúdos.

---

# Cliente

Aba no portal da própria marca: Conteúdos (`/cliente/{slug}/aprovacoes`), CRM (`/cliente/{slug}/crm`), Relatório (`/cliente/{slug}/relatorio`), Diretrizes da Marca (`/cliente/{slug}/brandbook`) e Conexões (`/cliente/{slug}/conexoes`). O proprietário é o usuário daquela conta. Cliente X não recebe tarefa de cliente Y.

## Conteúdos

- [ ] **Aprovar o roteiro.** Card em `aguardando_aprovacao`. Entrega = data de publicação mais próxima desse card. Aba Conteúdos.
- [ ] **Enviar as mídias gravadas.** Card em `aguardando_material` e o checklist `material_recebido` ainda não concluído. Entrega = data de publicação do card. Aba Conteúdos.
- [ ] **Aprovar a peça final.** Card em `aguardando_aprovacao_final`. Entrega = data de publicação mais próxima. Aba Conteúdos.
- [ ] **Ver o que foi publicado.** Card passou a `publicado` no dia. Entrega = o dia da publicação. Aba Conteúdos. A linha nasce Entregue só para o aviso, ou Aberta até o cliente abrir a peça — o padrão proposto é Aberta até ele abrir.

## CRM

- [ ] **Ver a caixa de entrada da marca.** Há sinal inbound sem resposta da marca no recorte. Entrega = hoje. Aba CRM. O cliente olha; quem responde no sistema da agência continua sendo o admin, se a operação for assim.
- [ ] **Ver quem está em risco.** Aba Em risco com pessoa no recorte. Entrega = fim do recorte. Aba CRM.

## Relatório

- [ ] **Abrir o relatório do período.** Fim de 7, 30 ou 90 dias com dados do cliente. Entrega = o dia em que o recorte fecha. Aba Relatório.
- [ ] **Ler o relatório depois de uma queda.** O mesmo sinal de CPA +40% da visão geral, mostrado só para aquele cliente. Entrega = hoje. Aba Relatório.

## Diretrizes da Marca

- [ ] **Enviar as diretrizes da marca.** Não há PDF da marca. Entrega = 7 dias após o acesso, ou a data combinada. Aba Diretrizes da Marca.
- [ ] **Substituir as diretrizes.** A agência marcou o arquivo para revisão. Entrega = a data pedida. Aba Diretrizes da Marca.

## Conexões

- [ ] **Conectar o Instagram.** A marca não tem conexão de Instagram. Entrega = hoje. Aba Conexões.
- [ ] **Conectar Meta Ads, Google Ads, GA4, Google Business ou TikTok.** Uma linha por rede que o contrato prevê e ainda não está conectada. Entrega = hoje. Aba Conexões.
- [ ] **Entrar de novo na rede.** A conexão pediu login ou o token venceu. Entrega = hoje, ou o dia anterior ao vencimento quando a data existir. Aba Conexões.

## Períodos que se repetem

- [ ] **Toda segunda-feira — o que precisa da sua aprovação.** Se houver card em `aguardando_aprovacao` ou `aguardando_aprovacao_final`. Entrega = a segunda mais próxima. Aba Conteúdos. Se não houver card, a linha daquela semana não nasce.
- [ ] **Toda segunda-feira — material que ainda falta.** Card em `aguardando_material` sem `material_recebido`. Entrega = a segunda mais próxima. Aba Conteúdos.
- [ ] **Todo fechamento de período — ver o relatório.** Entrega = último dia do recorte de 30 dias. Aba Relatório.

---

## Como a linha se fecha

- [ ] A tarefa do cliente some da vez dele quando o card muda de status, o arquivo chega ou a conexão fica saudável. Aí a linha vai para Entregue.
- [ ] Tarefa recorrente não encerra de vez: Entregue avança a data e volta para Aberta.
- [ ] No dia da entrega, o proprietário recebe o aviso no navegador e no sino.
- [ ] Quando a linha vai para Entregue, o cliente daquela tarefa também recebe o aviso.
