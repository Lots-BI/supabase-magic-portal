# O que ainda falta para uma organização operar os próprios clientes

Conferido em 05/10/2026 no site público, no código da `main` (`822c70b`) e no que o produto já faz com os clientes da Lots. Nenhum segredo entra neste arquivo. Google Cloud, TikTok, Meta, a lista de URLs do Supabase e o centro de API do Google Ads continuam fora desta verificação: os passos dessas telas seguem até você confirmar na própria tela.

Uma organização de fora deve cadastrar os clientes dela, convidar quem opera e quem acompanha, conectar as contas de mídia desses clientes e usar conteúdos, tarefas, CRM, relatórios, diretrizes e dashboards só nesse conjunto. O que a Lots faz hoje com os clientes da Lots, essa agência faz com os dela. Checkout, nota fiscal e pagamento ficam com a Lots.

## Já está no ar

- [lotsbi.leandromajr.com](https://lotsbi.leandromajr.com) publica a `main`. A página de entrar carrega `/assets/index-WZxEQJWk.js`. O pacote de setembro (`auth-DE33EX3e.js`) saiu do ar.
- Quem ainda não tem organização pede acesso em `/criar-conta` e completa os dados em `/solicitar-acesso`. Aprovar o pedido cria a organização e torna essa pessoa dona dela. A fila é `/admin/solicitacoes`, só na conta da Lots.
- O dono dessa organização entra no painel e vê só os clientes da organização dele: visão geral, tarefas, CRM, relatórios, conteúdos, diretrizes, clientes, usuários e conexões.
- Convidar como **Cliente** abre o portal daquele cliente. Convidar como **Administrador** cria outro dono da mesma organização. Isso não cria administrador global da plataforma.
- As tabelas de organizações, membros e pedidos já existem no Supabase. Há uma organização. As SQL 65, 66 e 67, e o ajuste que destrava o login, já foram aplicadas. Não rode de novo.
- No `.env` local, Google e Meta já têm valor. `TIKTOK_APP_ID` e `TIKTOK_APP_SECRET` estão vazios. `APP_URL` local é `http://localhost:8080`. `CRON_SECRET` fica só nos secrets do GitHub.
- Em Production, `APP_URL` precisa continuar `https://lotsbi.leandromajr.com`, sem barra no final, junto com `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` e `GOOGLE_ADS_DEVELOPER_TOKEN`.

## 1. Aprovar a organização

Isto é o que abre a porta. Sem esta aprovação a pessoa fica na tela de pedido e não cadastra cliente.

1. A agência abre `https://lotsbi.leandromajr.com/auth` e escolhe pedir acesso.
2. Cria e-mail e senha em `/criar-conta`.
3. Em `/solicitar-acesso`, informa nome, documento e WhatsApp e envia.
4. Você entra com a conta da Lots e abre `/admin/solicitacoes`.
5. Aprova o pedido. O sistema cria a organização e grava essa pessoa como dona.
6. Ela entra de novo. O destino é o painel. Rejeitar devolve o pedido sem criar organização.

O cadastro público do Supabase continua desligado. A conta nasce por este fluxo.

## 2. O que essa organização já faz com os clientes dela

Depois do passo 1, na própria conta:

1. **Clientes** → cadastra o cliente. O cadastro fica na organização dela.
2. **Usuários** → convida a pessoa do cliente (tipo Cliente, com o cliente vinculado) ou outra pessoa da agência (tipo Administrador).
3. **Conexões** → conecta a conta daquele cliente.
4. Opera conteúdos, tarefas, CRM, relatórios e diretrizes nesse cliente.
5. A pessoa convidada como Cliente vê o portal daquele cliente: aprovações, publicações, Instagram, Meta Ads, Google Ads, GA4, Google Business quando houver dados, relatório, CRM e diretrizes.

Ela não vê clientes de outra organização, nem Pedidos de acesso, nem Organizações, nem Serviços, Branding, diagnóstico ou AI Workspace. Plano estratégico e Central estão ocultos para todo mundo, inclusive para a Lots.

Dois clientes com o mesmo nome em organizações diferentes são recusados. O nome precisa ser distinto.

## 3. Google — retorno e tela de permissão, uma vez para todas as organizações

O botão Conectar de Google Ads, GA4 e YouTube usa o mesmo retorno: `APP_URL` + `/oauth/google/callback`.

- Produção: `https://lotsbi.leandromajr.com/oauth/google/callback`
- Este computador: `http://localhost:8080/oauth/google/callback`

1. Abra [Google Cloud Console](https://console.cloud.google.com/) no projeto do client OAuth.
2. **APIs e serviços** → **Credenciais**.
3. Abra o ID do cliente do tipo **Aplicativo da Web** cujo ID está em `GOOGLE_OAUTH_CLIENT_ID`.
4. Em **URIs de redirecionamento autorizados**, salve as duas URLs, cada uma no próprio campo. Sem barra no final e sem `?`.
5. Salvar.

Política de privacidade, página inicial e termos são a tela de consentimento. Podem ficar como estão.

Para uma organização de fora conectar o Gmail do cliente dela, a tela de permissão precisa estar **Em produção**. Enquanto estiver **Testando**, só entra o Gmail que estiver em **Usuários de teste**.

1. **APIs e serviços** → **Tela de permissão OAuth**.
2. Se o status for Testando e a agência de fora for usar o próprio Gmail, publique a tela (**Publicar app**).
3. Enquanto continuar em Testando, cada Gmail que clicar em Conectar tem de estar em **Usuários de teste**.

GA4 e YouTube usam este client. Eles não usam o developer token de anúncios.

## 4. YouTube — reconectar o canal que já existia

O código pede `youtube.upload` além da leitura. Conexão antiga só lê números.

1. No cliente, abra a conexão do YouTube e conecte de novo.
2. Aceite a permissão no Gmail que a tela de permissão deixar passar.
3. O upload grava o vídeo como público e recusa arquivo acima de 64 MB.

Ainda não existe página de métricas do YouTube no portal do cliente. A coleta do canal e o envio de vídeo já estão no fluxo de conexão.

## 5. Google Ads — token em modo teste

O developer token foi informado como modo teste. Esta verificação não abre o [Google Ads API Center](https://ads.google.com/aw/apicenter). Trate como teste até a tela mostrar outro status.

Nesse modo a plataforma só lê contas de anúncio de teste do Google. A conta real do cliente de uma organização de fora não aparece.

1. Abra o API Center na conta gestora (MCC) em que o token foi emitido.
2. Veja o status.
3. Se estiver **Test**, peça acesso **Basic** (ou Standard, se o Google oferecer) e espere a aprovação.
4. Não gere outro token. O valor da Vercel e do `.env` continua. Quando o status mudar, o mesmo token lê contas reais.

## 6. TikTok — app, quando o SMS chegar

A API de anúncios (`ads.read`) coleta métricas de campanha. Ela não publica vídeo no perfil. Card marcado como TikTok falha a publicação de propósito. Não crie um app de criadores para contornar isso.

O painel do cliente em TikTok ainda é uma página vazia. A conexão e a coleta no hub já existem; a página de métricas do cliente ainda não.

1. Abra [TikTok Marketing API](https://business-api.tiktok.com/portal).
2. Crie o app. Se a tela pedir SMS e o código não chegar, pare aqui.
3. No redirect / callback, salve:
   - `https://lotsbi.leandromajr.com/oauth/tiktok/callback`
   - `http://localhost:8080/oauth/tiktok/callback`
4. Copie o App ID para `TIKTOK_APP_ID` na Vercel Production e na linha já existente do `.env` local. Sem aspas e sem espaço antes do `=`.
5. Copie o Secret para `TIKTOK_APP_SECRET` nos mesmos dois lugares.
6. Redeploy na Vercel.
7. Reinicie o `npm run dev` neste computador.
8. Não commite o `.env`.

Os workflows de coleta já estão na `main` e chamam `APP_URL` + `CRON_SECRET`. A rota responde no site publicado. O botão Conectar do TikTok passa a funcionar depois deste passo.

## 7. Meta — app ativo para negócio de fora

Hoje só conta de testador do app conecta anúncio ou Instagram. A organização de fora precisa do app **Ativo**.

1. Abra [developers.facebook.com](https://developers.facebook.com/) no app cujo ID já está em `META_APP_ID`. Não crie outro app.
2. **Configurações** → **Básico**. Domínio `lotsbi.leandromajr.com` e a URL da política de privacidade.
3. **Facebook Login** → **Configurações** → **URIs de redirecionamento OAuth válidos**:
   - `https://lotsbi.leandromajr.com/oauth/meta/callback`
   - `http://localhost:8080/oauth/meta/callback` para teste nesta máquina
4. Em cada produto usado (Facebook Login, Instagram, Marketing API), conclua a **App Review** dos usos que o cliente de fora precisa: anúncios, Instagram e publicação.
5. Mude o app de **Em desenvolvimento** para **Ativo**.
6. Mantenha `META_APP_ID` e `META_APP_SECRET`.

## 8. URLs de login do Supabase

A lista de Redirect URLs não pôde ser lida daqui. Produção e `http://localhost:5173/auth/callback` já foram cadastradas antes. A porta deste computador é a 8080.

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL:** `https://lotsbi.leandromajr.com`
3. Em **Redirect URLs**, estas três precisam existir:
   - `https://lotsbi.leandromajr.com/auth/callback`
   - `https://lotsbi.leandromajr.com/auth`
   - `http://localhost:8080/auth/callback`
4. Salvar. Não apague as URLs de produção que já funcionam.

O convite enviado pelo site no ar volta para `https://lotsbi.leandromajr.com/auth/callback`.

## 9. E-mail do convite

O convite continua saindo pelo Supabase. Para o dono da organização convidar o cliente com remetente do produto:

1. Crie o envio transacional (Resend ou Postmark) no domínio do produto.
2. Supabase → **Authentication** → **Emails** → **SMTP Settings**. Ligue o SMTP com host, porta, usuário e senha do provedor.
3. O remetente tem de ser um endereço desse domínio.
4. Envie um convite de teste. O link abre `https://lotsbi.leandromajr.com/auth/callback`.

## O que o código ainda não iguala

Isto não se resolve nas telas acima:

- A tela de novo usuário só oferece Cliente e Administrador. Gestor, gestor de tráfego e social media existem no banco e operam o painel, mas a tela não deixa escolhê-los. Administrador, neste convite, é outro dono da organização.
- TikTok no portal do cliente é página vazia. YouTube não tem página de métricas do cliente. Google Business tem dashboard, mas o assistente de conexão não oferece essa plataforma.
- Checkout, nota fiscal e pagamento continuam só com a Lots.

## O que devolver no chat

Sem colar segredo.

- Passo 1: o primeiro pedido aprovado e o nome da organização que apareceu.
- Passo 3: as duas URIs do Google salvas, e se a tela de permissão está Em produção ou ainda em Testando.
- Passo 5: o status do developer token (Test, Basic ou Standard).
- Passo 6: quando o SMS funcionar, diga só que ID, secret e os dois redirects do TikTok foram salvos e que a Vercel foi republicada.
- Passo 7: quando o app da Meta estiver Ativo.
