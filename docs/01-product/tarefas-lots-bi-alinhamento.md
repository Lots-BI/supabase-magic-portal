---
title: Alinhamento de quem faz o quê nas Tarefas Lots BI
description: Perguntas para completar a tabela Tarefas Lots BI. Proprietário e quem executa podem ser pessoas diferentes.
status: living
owner: Produto Lots BI
last_review: 2026-10-03
---

# Alinhamento — Tarefas Lots BI

Preencha embaixo de cada pergunta. Pode responder em uma linha. Quando eu receber o aviso de que este arquivo foi atualizado, uso só o que estiver escrito aqui.

Hoje a coluna **Proprietário** e a pessoa que **faz** a ação estão juntas. O caso das diretrizes mostra que isso não basta.

Exemplo que você já deu:

- Tarefa: Enviar as diretrizes da marca
- Proprietário na tabela: o cliente daquela marca
- Quem envia de verdade: friessrafa@gmail.com

Confirme ou corrija esse exemplo aqui:

- Proprietário:
- Quem faz:
- O cliente vê essa linha? sim / não
- A Rafa vê essa linha na tabela de admin? sim / não
- São duas linhas (uma para cada pessoa) ou uma linha só?

Use o mesmo jeito nas tarefas abaixo.

Emails já usados na tabela de admin:

- Conteúdos e Diretrizes da Marca: friessrafa@gmail.com
- Demais áreas de admin: leandromajr@gmail.com

Se o email da Rafa estiver errado, escreva o certo:

---

## Como responder cada tarefa

Para cada item, preencha:

- Existe essa linha? sim / não
- Quem vê: admin / cliente / os dois
- Proprietário: email, ou "cliente da marca", ou "responsável do cadastro"
- Quem faz: email, ou "cliente da marca"
- Nasce quando:
- Some e vai ao log quando:
- Data de entrega:
- Botão abre qual página:
- Repete? não / toda segunda / todo dia 1 / outro
- Aviso no dia da entrega vai para: proprietário / quem faz / os dois

Se proprietário e quem faz forem a mesma pessoa, escreva o mesmo nome nos dois.

---

## Conteúdos

### aprovar o roteiro

Card enviado pelo adm, depois que o adm escreveu o roteiro e enviou para aprovação.

- Existe essa linha? sim
- Quem vê: cliente e adm
- Proprietário: cliente
- Quem faz: cliente
- Nasce quando: quando adm cria o reoteiro e envia para aprovação.
- Some e vai ao log quando: cliente aprovar o roteiro
- Data de entrega: 7 dias antes da data de publicação
- Botão abre qual página: abre o próprio popup de aprovação da aba de conteúdos, sem que o cliente precise ir até a aba.
- Repete? não porque eu quero que faça 1 linha para cada card existente do qual o cliente deve aprovar
- Aviso no dia da entrega vai para: cliente

### Enviar as mídias

Card aguardando material, e o material ainda não chegou. Hoje o proprietário é o cliente.

- Existe essa linha? sim
- Quem vê: cliente e adm
- Proprietário: cliente
- Quem faz: cleinte
- Quem cobra o cliente, se ele não enviar? friessrafa@gmail.com
- Nasce quando: card aprovado -> card aguardando material
- Some e vai ao log quando: cliente envia o material do card
- Data de entrega: até 7 dias antes da data de postagem do card
- Botão abre qual página: abre direto o popup de enviar material do card específicado na linha
- Repete? não porque eu quero que faça 1 linha para cada card existente do qual o cliente deve enviar o material
- Aviso no dia da entrega vai para: cliente

### Baixar o material

O cliente marcou que enviou. Hoje vira linha de admin.

- Existe essa linha? sim
- Quem vê: adm
- Proprietário: friessrafa@gmail.com
- Quem faz: Rafa
- Nasce quando: quando cliente enviar o material e o material estiver disponível para download
- Some e vai ao log quando: quando o conteúdo já foi baixado por adm
- Data de entrega: deve ser baixado no mesmo dia que o cliente enviou o material
- Botão abre qual página: dentro da aba de conteúdos, crie um botão chamado (Biblioteca) lá deve conter separado por cliente, com um seletor de cliente, um clone do google drive, ser possível criar pastas de arquivos e subir arquivos para determinadas pastas. Crie um Clone do Google Drive dentro dessa sub-aba de conteúdos. Porém cada mídia enviada, deve ter seus status visiveis, (Baixado ou não Baixado pelo adm) para visualização tanto adm quanto cliente verem.
- Repete? Aprece sempre que tiver um download de upload de material que o cliente enviou pendente.
- Aviso no dia da entrega vai para: proprietário/adm

### Ajustar o design

Card em alterações de design.

- Existe essa linha? sim
- Quem vê: adm
- Proprietário: friessrafa@gmail.com
- Quem faz: rafa
- Nasce quando: cliente pedir alterações na mídia final
- Some e vai ao log quando: adm envia para aprovação novamente.
- Data de entrega: 3 dias após o pedido
- Botão abre qual página: Abre o card do qual o cliente pediu alteração
- Repete? Apenas quando tiver conteúdos para realizar alterações
- Aviso no dia da entrega vai para: adm/quem faz/proprietário (sempre para todos)

### Aprovar a peça final

Card aguardando aprovação final. Hoje o proprietário é o cliente.

- Existe essa linha? sim
- Quem vê: cliente (Todas as tarefas de clientes, adm tb é possível de ver as tarefas de clientes, todas elas, mesmo que anteriormente ou posteriormente eu tenha colocado para alguma tarefa de cliente que apenas cliente vê. Não, Para tarefas de cliente, tanto adm quanto cliente vê) e para tarefas de adm, apenas adm enxerga! (Isso para todas as tarefas da tabela autômática, para a primeira tabela, que é feita manualmente, tanto adm quanto cliente conseguem ver)
- Proprietário: cliente
- Quem faz: cliente
- Quem cobra o cliente? friessrafa@gmail.com
- Nasce quando: adm envia o card final de aprovação
- Some e vai ao log quando: o card é aprovado
- Data de entrega: prazo de 3 dias após o adm enviar a mídia final
- Botão abre qual página: abre o próprio card de aprovação
- Repete? sempre que tiver card final em aprovação pendente
- Aviso no dia da entrega vai para: cliente

### Conferir o que vai ao ar

Card agendado.

- Existe essa linha? sim
- Quem vê: adm
- Proprietário: friessrafa@gmail.com
- Quem faz: rafa
- Nasce quando: quando card final é aprovado e consequentemente agendado
- Some e vai ao log quando: quando a própria plataforma lots bi recebe a confirmação de que foi realmente publicado de alguma forma. talvez conversando com a aba de publicações no dashboard. Daí você decide como a plataforma passa a saber que o card foi ou não publicado.
- Data de entrega: na data de postagem do card.
- Botão abre qual página: abre o link da públicação dentro do Instagram.
- Repete? sempre que tiver card agendado
- Aviso no dia da entrega vai para: friessrafa@gmail.com

### Republicar falha

A publicação automática falhou.

- Existe essa linha? sim
- Quem vê: adm
- Proprietário: friessrafa@gmail.com
- Quem faz: Rafa
- Nasce quando: Publicação automática falha
- Some e vai ao log quando: publicação bem sucedida ou adm marca como publicado
- Data de entrega: prazo 1 dia
- Botão abre qual página: página de publicação da lots bi. Crie uma nova sub-página de conteúdos chamada (publicar) -> com todas as configurações que são possíveis de utilizar para agendamento ou publicação direta seguindo a nossa api de publicações.
- Repete? sempre que uma publicação automática falhar
- Aviso no dia da entrega vai para: friessrafa@gmail.com

### Ver o que foi publicado

Ainda não vira linha. O card passou a publicado.

- Existe essa linha? sim
- Quem vê: adm
- Proprietário: friessrafa@gmail.com
- Quem faz: rafa
- Nasce quando: quando o card passa a publicado
- Some e vai ao log quando: quando o passou a ser poublicado
- Data de entrega: mesmo dia da publicação
- Botão abre qual página: se possível o url da publicação, caso contrário: url da página do instagram do cliente referente à publicação
- Repete? sempre que ouver uma publicação.
- Aviso no dia da entrega vai para: friessrafa@gmail.com

### Fila da semana

Ainda não vira linha. Ideia: toda segunda, o que a conta precisa produzir.

- Existe essa linha? sim
- Quem vê: cliente e adm
- Proprietário: cliente e adm (uma fila de produção para cada.) pode ser até ser implementada como uma nova feature dentro da tabela atual. a tabela automática deve então ser uma fila de produção. Apenas admenxerga as tarefas automáticas de adm, porém, filtrando em um seletor de cliente, é possível também exibir determinado cliente selecionado dentre os clientes ou nenhum, (tarefas automaticas de clientes aparecem somente quando o cliente é filtrado, caso adm não filtre nada, então apenas tarefas automaticas de adms da organização é exibida) (sim, painel do adm em tarefas pode ser diferente do painel de como o cliente exerga, por exemplo, na visualização do cliente apenas será possível enxergar as tarefas designadas à quele cliente, não será poddível enxergar tarefas de outros clientes nem dos adms. (Isso na tabela automática)). 

Ou, se achar melhor, pode criar uma nova feature abaixo da tabela automatica e acima da tabela de logs. Sendo uma fila de produção.

deve se atualizar sozinha, conforme as tarefas vãos sendo concluídas.

---

## Diretrizes da Marca

### Cobrar as diretrizes da marca

Cliente ativo sem PDF. Hoje é linha de admin. Depois da regra por área, a dona é friessrafa@gmail.com.

- Existe essa linha? sim
- Quem vê: adm
- Proprietário: rafa
- Quem faz: Rafa
- A Rafa cobra, ou o cliente é que precisa enviar, ou os dois têm linha? ninguém cobra. A Rafa que faz e envia.
- Nasce quando: quando diretrizes vazia
- Some e vai ao log quando: diretrizes preenchida
- Data de entrega: data combinada, 7 dias após o início, ou outra? prazo de 7 dias após o início
- Botão abre qual página: aba de diretrizes
- Repete? não
- Aviso no dia da entrega vai para: friessrafa@gmail.com

### Enviar as diretrizes da marca

Mesmo caso, hoje como linha do cliente. Você disse que quem envia é friessrafa@gmail.com.

- Existe essa linha? sim
- Quem vê: adm
- Proprietário: friessrafa@gmail.com
- Quem faz: rafa
- O arquivo quem sobe no sistema é a Rafa, o cliente, ou qualquer um? Rafa
- Nasce quando: cliente criado e diretrizes vazia
- Some e vai ao log quando: quando o PDF existe
- Data de entrega: 7 dias após o ínicio
- Botão abre qual página: aba de diretrizes
- Repete? não
- Aviso no dia da entrega vai para: friessrafa@gmail.com

## CRM

### Responder a pessoa na caixa

Há mensagem sem resposta da marca. Hoje é linha de admin. Dono: leandromajr@gmail.com.

- Existe essa linha? sim
- Quem vê: cliente
- Proprietário: leandromajr@gmail.com
- Quem faz: ambos
- O cliente também precisa olhar, ou só a agência responde? ambos
- Nasce quando: quando bom nível dentro do CRM
- Some e vai ao log quando: quando alguém responde no CRM
- Data de entrega: 7 dias após ter alcançado um bom nível dentro do CRM
- Botão abre qual página: CRM do cliente pertencente à tarefa
- Repete? não
- Aviso no dia da entrega vai para: leandromajr@gmail.com

### Atender intenção alta

Pessoa em risco ou dormindo, intenção 70 ou mais, sem resposta da marca. Hoje é linha de admin.

- Existe essa linha? sim
- Quem vê: cliente e adm
- Proprietário: leandromajr@gmail.com
- Quem faz: ambos
- O corte de 70 está certo? Perfeito
- Nasce quando: lead chegou em intenção 70 ou mais, sem resposta da marca
- Some e vai ao log quando: respondido perante o CRM
- Data de entrega: 7 dias após entrar como intenção 70 ou mais, sem resposta da marca
- Botão abre qual página: CRM do cliente pertencente à tarefa
- Repete? não
- Aviso no dia da entrega vai para: leandromajr@gmail.com

### Olhar quem está em risco

Pessoa em risco ou dormindo, sem o corte de intenção. Hoje é linha do cliente.

- Existe essa linha? sim
- Quem vê: cliente e adm
- Proprietário: leadromajr@gmail.com
- Quem faz: ambos
- Nasce quando: quando lead entrar como Pessoa em risco ou dormindo, sem o corte de intenção no CRM
- Some e vai ao log quando: após alguma interação do cliente ou adm com o cliente perante o CRM
- Data de entrega: 7 dias após entrar como Pessoa em risco ou dormindo, sem o corte de intenção
- Botão abre qual página: CRM com o perfil do lead aberto.
- Repete? não
- Aviso no dia da entrega vai para: leandromajr@gmail.com

### Puxar o Instagram

Conexão de Instagram sem sync no dia. Hoje é linha de admin, aba CRM, botão na conexão.

- Existe essa linha? sim
- Quem vê: leandromajr@gmail.com
- Proprietário: leandromajr@gmail.com
- Quem faz: leandromajr@gmail.com
- A aba certa é CRM ou Conexões? a aba correta é na própria aba do Instagram. se possível, fazer o botão dessa linha já puxar a métrica faltante. Assim como o botão de puxar métricas da aba do instagram funciona hoje. Daí, o notão da linha faria a mesma coisa somente para o cliente designado na tarefa do botão pertencente.
- Nasce quando: quando Conexão de Instagram sem sync no dia
- Some e vai ao log quando: quando não houver pendencia diária de sync
- Data de entrega: no mesmo dia
- Botão abre qual página: botão realiza o sync daquele cliente faltante. da exata mesma forma que o botão de sync faz dentro do dashboard de Instagram
- Repete? não
- Aviso no dia da entrega vai para: leandromajr@gmail.com

### Caixa do CRM toda segunda

Ainda não vira linha.

- Existe essa linha? sim
- Quem vê: ambos
- Proprietário: cliente
- Quem faz: cliente
- Nasce quando: segunda-feira = algo na caixa do CRM
- Some e vai ao log quando: quando a caixa estiver sido respondida/vazia/não sei como a caixa se comporta dentro da plataforma.
- Data de entrega: segunda-feira
- Botão abre qual página: caixa CRM
- Repete? Segunda-feira
- Aviso no dia da entrega vai para: cliente

---

## Relatórios

Nenhuma destas vira linha hoje. Falta um fato claro de "pronto" para o relatório, o CPA e o sync do portfólio.

### Analisar o relatório do período

- Existe essa linha? sim
- Períodos: 7, 30, 90, mês, ou outro? quinzenal
- Quem vê: cliente e adm
- Proprietário: leandromajr@gmail.com
- Quem faz: leandromajr@gmail.com
- Nasce quando: início de cada novo periodo (Segunda-feira)
- Some e vai ao log quando: o que conta como revisado? na aba de relatórios, crie para cada plataforma um botão de análise, após clicado, abre um editor de texto completo, então eu, redijo a análise e envio, essa análise fica dentro do relatório de cada plataforma separadamente. 
- Data de entrega: Todas Segundas-feiras
- Botão abre qual página: relatório do cliente correspondente à tarefa
- Repete? Segunda-feira
- Aviso no dia da entrega vai para: leandromajr@gmail.com

### Abrir o relatório, do lado do cliente

- Existe essa linha? não
- Quem vê:
- Proprietário:
- Quem faz:
- Nasce quando:
- Some e vai ao log quando: quando o cliente abre?
- Data de entrega:
- Botão abre qual página:
- Repete?
- Aviso no dia da entrega vai para:

### Explicar queda de resultado

Ideia antiga: CPA subiu 40% ou mais.

- Existe essa linha? sim
- Qual número dispara: CPA, outro? qualquer relacionado a mau desempenho
- Qual porcentagem? 40%
- Quem vê: Apenas adm
- Proprietário: leandromajr@gmail.com
- Quem faz: leandromajr@gmail.com
- Nasce quando: CPA do cliente subiu 40% ou mais
- Some e vai ao log quando: (Crie uma parte dentro do relatório para esse tipo de ocasião, será preenchido somente quando algo do tipo acontecer. Só aparecerá informações nessa parte do relatório quando o botão dessa tarefa for apertado (Botão da tarefa deve acionar um editor de texto, irei redijir oque aconteceu e então enviar, após enviar essa redação será enviada para esse campo específico do relatório "Esse campo poder editado por um adm a qualquer momento dentro da aba de relatório))
- Data de entrega: prazo de 3 dias após CPA subir 40% ou mais
- Botão abre qual página:o botão dessa tarefa for apertado (Botão da tarefa deve acionar um editor de texto, irei redijir oque aconteceu e então enviar, após enviar essa redação será enviada para esse campo específico do relatório "Esse campo poder editado por um adm a qualquer momento dentro da aba de relatório
- Repete?não
- Aviso no dia da entrega vai para: leandromajr@gmail.com

### Relatório todo dia 1

- Existe essa linha? não. relatórios são segundas-feiras
- Quem vê:
- Proprietário:
- Quem faz:
- Nasce quando:
- Some e vai ao log quando:
- Data de entrega:
- Botão abre qual página:
- Repete?
- Aviso no dia da entrega vai para:

---

## Conexões

### Conectar a rede que o contrato prevê

Instagram, Meta Ads, Google Ads, GA4, Google Business ou TikTok ligados no cadastro e sem conexão ativa. Hoje é linha do cliente.

- Existe essa linha? sim
- Uma linha por rede? sim
- Quem vê: leandromajr@gmail.com
- Proprietário: cliente
- Quem faz: o cliente entra na conta, ou alguém da agência conecta? por enquanto, alguém da agência conecta
- Nasce quando: quando um cliente não tem 
- Some e vai ao log quando: conexão ativa?
- Data de entrega: prazo de 7 dias.
- Botão abre qual página: nova conexão de respectiva plataforma mencionada na tarefa da qual não tem conexão ativa.
- Repete? não
- Aviso no dia da entrega vai para: leandromajr@gmail.com

### Resolver conexão com falha

Saúde ruim, degradada ou desligada. Hoje é linha de admin, dono leandromajr@gmail.com.

- Existe essa linha? sim
- Quem vê: leandromajr@gmail.com
- Proprietário: cliente
- Quem faz: leandromajr@gmail.com
- Nasce quando: quando conexão: Saúde ruim, degradada ou desligada
- Some e vai ao log quando: conexão de respectiva tarefa saudável.
- Data de entrega: prazo de 7 dias
- Botão abre qual página: página da respectiva conexão com falha
- Repete? não
- Aviso no dia da entrega vai para: leandromajr@gmail.com

### Renovar acesso ou entrar de novo

Token perto de vencer, ou a rede pediu login. Ainda não vira linha. Não há data de vencimento guardada hoje.

- Existe essa linha? sim
- Onde essa data de vencimento aparece, se existir? não sei nem se existe
- Quem vê: leandromajr@gmail.com
- Proprietário: cliente
- Quem faz: leandromajr@gmail.com
- Nasce quando:
- Some e vai ao log quando:
- Data de entrega:
- Botão abre qual página:
- Repete?
- Aviso no dia da entrega vai para:

### Conta sem sync há mais de 48 horas

Ainda não vira linha.

- Existe essa linha? sim
- 48 horas está certo? sim
- Quem vê: leandromajr@gmail.com
- Proprietário: cliente
- Quem faz: leandromajr@gmail.com
- Nasce quando: quando conta sem sync há mais de 48 horas
- Some e vai ao log quando: quando sync atualizado e restaurado
- Data de entrega: prazo de 3 dias
- Botão abre qual página: abre o dashboard da plataforma, onde temos o otão de sync.
- Repete? não
- Aviso no dia da entrega vai para: leandromajr@gmail.com

---

## Áreas do menu que ainda não geram tarefa

Diga se alguma destas precisa de linha na Tarefas Lots BI. Se sim, descreva a ação, quem vê, o proprietário, quem faz, quando nasce e quando some.

- Visão geral: não
- Clientes: não
- Usuários: não
- Organizações: não
- Pedidos de acesso: sim (Para quando chegar pedidos de acesso, botão de ação ir até a aba dos pedidos de acesso.)
- Serviços: não
- Branding: não
- Novidades: não
- Painel operacional: não
- Auditoria de views: não
- AI Workspace: não
- Tutorial: não
- Knowledge Center: não
- Privacidade: não
- Termos: não

---

## Regras que valem para a tabela inteira

- Uma marca pode ter vários usuários clientes. A linha do cliente vai para qual deles? O primeiro acesso, todos, ou um email fixo?
- Se o proprietário for o cliente e quem faz for a Rafa ou o Leandro, o aviso do dia da entrega vai para quem?
- Quando a Rafa conclui uma ação "do cliente", a linha do cliente some sozinha, a linha dela some, ou as duas?
- Tarefa que você marcou Entregue na mão e depois devolveu do log: volta com o dono automático ou com o dono que estava no log?
- Linha que alguém editou na caixinha: a automação pode trocar o proprietário de novo ou a edição fica?
- Além de friessrafa@gmail.com e leandromajr@gmail.com, tem mais alguém que executa tarefa? Qual email e em quais ações?
- Tem tarefa repetida que não está neste arquivo? Escreva o nome, quem faz e quando ela volta.
