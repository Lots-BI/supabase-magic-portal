# O que ainda é humano

Conferido em 03/10/2026. Nenhum segredo entra neste arquivo.

A verificação de hoje olhou o banco, o `.env` local (só se o valor existe, sem ler o conteúdo), o endereço que o código usa na hora de conectar, e o JavaScript que o site [lotsbi.leandromajr.com](https://lotsbi.leandromajr.com) está servindo. Não foi possível abrir daqui o Google Cloud, a Vercel, o TikTok, a Meta nem a tela de URLs do Supabase. O que depende dessas telas continua como passo seu.

## Já conferido — não refaça

- No Supabase do projeto já existem as tabelas de organizações, membros e pedidos de acesso. As SQL 65, 66 e 67, e o ajuste de desempenho que destrava o seu login, já foram aplicadas. Não rode de novo.
- No `.env` local, estas três linhas já têm valor: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` e `GOOGLE_ADS_DEVELOPER_TOKEN`. Não apague e não cole de novo.
- `META_APP_ID` e `META_APP_SECRET` também já têm valor no `.env` local.
- `APP_URL` no `.env` local é `http://localhost:8080`. É essa origem que o app manda no OAuth desta máquina. A porta 5173 está fechada. A 8081 responde, mas o app não usa ela no retorno do Google.
- `TIKTOK_APP_ID` e `TIKTOK_APP_SECRET` existem no `.env` e estão vazios. É o esperado enquanto o app do TikTok não nasce.
- `CRON_SECRET` não está no `.env`. Continua assim. Ele fica só nos secrets do GitHub Actions, no mesmo nome que os crons atuais já usam, junto com `APP_URL`.
- Você já ativou no Google Cloud a Google Ads API, a Google Analytics Data API e a YouTube Data API v3, e já colocou o client OAuth e o developer token na Vercel. A lista da Vercel não pôde ser reaberta hoje. No próximo deploy, essas três variáveis precisam continuar em Production. Não crie nomes novos.

## O que o site no ar ainda não tem

O JavaScript de login em produção ainda é o pacote antigo `auth-DE33EX3e.js`. Esse pacote não tem pedido de acesso, organizações, upload de YouTube nem os crons novos. O código novo está neste computador, ainda fora da `main`. Enquanto não for publicado, o endereço público não usa nada disso. Conectar Google Ads, GA4 ou YouTube no site no ar continua no código antigo.

Faça os passos abaixo nesta ordem.

## 1. Publicar o código novo

Sem este passo, os passos 2 a 6 não mudam o site público.

1. Confirme que `.env` não entra no commit. Ele não deve ser enviado.
2. Publique a branch que contém organizações, pedido de acesso, YouTube com escopo de upload e os workflows `tiktok-campaigns-sync-cron.yml` e `youtube-channel-sync-cron.yml`.
3. O deploy da Vercel que atende [lotsbi.leandromajr.com](https://lotsbi.leandromajr.com) precisa ser esse código. A Vercel publica a `main`.
4. Depois do deploy, abra `https://lotsbi.leandromajr.com/auth` e confira se a tela de entrar oferece pedir acesso. Se a frase não aparecer, o site ainda está no pacote antigo.
5. Na Vercel, em Production, confirme que continuam presentes, com valor:
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
   - `GOOGLE_ADS_DEVELOPER_TOKEN`
   - `APP_URL` = `https://lotsbi.leandromajr.com` (sem barra no final)
6. Os workflows novos só disparam na `main`, ou quando alguém os dispara à mão. Eles chamam `APP_URL` + `CRON_SECRET` que já existem nos secrets do GitHub. Não invente `TIKTOK_CRON_SECRET` nem outro nome.

## 2. Redirect do Google — o retorno que o botão Conectar usa

Política de privacidade, página inicial e termos são a tela de consentimento. Podem ficar como estão. Elas não são o endereço para onde o Google devolve o navegador.

O Lots BI monta o retorno assim: o valor de `APP_URL` mais `/oauth/google/callback`. Hoje isso são exatamente estas duas URLs:

- Produção: `https://lotsbi.leandromajr.com/oauth/google/callback`
- Este computador: `http://localhost:8080/oauth/google/callback`

Google Ads, GA4 e YouTube usam o mesmo retorno. Uma URI serve para os três.

1. Abra [Google Cloud Console](https://console.cloud.google.com/) no projeto do client OAuth.
2. **APIs e serviços** → **Credenciais**.
3. Abra o ID do cliente do tipo **Aplicativo da Web**. É o client cujo ID está em `GOOGLE_OAUTH_CLIENT_ID`.
4. Em **URIs de redirecionamento autorizados**, adicione as duas URLs acima, cada uma no próprio campo.
5. Sem barra no final, sem `?`, com `https` na de produção e `http` na local.
6. Salvar.

Se a URI não estiver nessa lista, o botão Conectar responde `redirect_uri_mismatch`.

Para testar na sua máquina, abra `http://localhost:8080`, não a 8081 e não a 5173. O `.env` aponta o retorno para a 8080.

Enquanto a tela de permissão OAuth estiver em **Testando**:

1. **APIs e serviços** → **Tela de permissão OAuth**.
2. Em **Usuários de teste**, adicione o Gmail de cada pessoa que vai clicar em Conectar.
3. Salvar.

Sem esse Gmail na lista, o Google recusa o login mesmo com a senha certa.

## 3. YouTube — reconectar depois que o código novo estiver no ar

O código novo pede o escopo `youtube.upload`, além de leitura. Uma conexão feita antes disso só lê números e não envia vídeo.

1. Só faça isto depois do passo 1, com o site já no código novo.
2. No cliente, abra a conexão do YouTube e conecte de novo com o mesmo fluxo do Google.
3. Aceite a permissão nova no Gmail que está em usuários de teste.
4. O upload grava o vídeo como público e recusa arquivo acima de 64 MB.

GA4 não usa o developer token de anúncios. YouTube também não. Os dois usam o client OAuth do passo 2.

## 4. Google Ads — token ainda em modo teste

Você informou que o developer token está em modo teste. Esta verificação não abre o centro de API do Google Ads, então trate como ainda em teste até você ver o status na tela.

Nesse modo o Lots BI só enxerga contas de anúncio de teste do Google. A conta real de um cliente não aparece.

1. Abra [Google Ads API Center](https://ads.google.com/aw/apicenter) na conta gestora (MCC) em que o token foi emitido.
2. Veja o status do developer token.
3. Se estiver **Test**, peça acesso **Basic** (ou Standard, se o Google oferecer) e espere a aprovação.
4. Não gere outro token. O valor que já está na Vercel e no `.env` continua. Quando o status mudar, o mesmo token passa a ler contas reais.
5. Enquanto esperar, o teste honesto é uma conta de anúncios de teste do Google, não a conta de um cliente.

## 5. TikTok — quando o SMS chegar

O código usa a API de anúncios (`ads.read`). Essa credencial coleta métricas de campanha. Ela não publica vídeo no perfil. Se um card estiver marcado como TikTok, a publicação falha de propósito com essa explicação. Não crie um app de criadores para contornar isso.

1. Abra [TikTok Marketing API](https://business-api.tiktok.com/portal) na conta de anúncios.
2. Crie o app. Se a tela pedir SMS e o código não chegar, pare aqui. Sem o app, não há ID nem secret.
3. No app, no campo de redirect / callback, salve exatamente:
   - `https://lotsbi.leandromajr.com/oauth/tiktok/callback`
   - `http://localhost:8080/oauth/tiktok/callback`
4. Copie o App ID para `TIKTOK_APP_ID` em dois lugares: Vercel Production e a linha já existente no `.env` local. Sem aspas e sem espaço antes do `=`.
5. Copie o Secret para `TIKTOK_APP_SECRET` nos mesmos dois lugares.
6. Redeploy na Vercel para o site público ler as variáveis novas.
7. Reinicie o `npm run dev` para o computador local ler o `.env`.
8. Não commite o `.env`.

Os crons de coleta só passam a ser chamados depois do passo 1, porque o workflow mora na `main`.

## 6. Confira as URLs de login do Supabase

A lista de Redirect URLs do Auth não pôde ser lida daqui. Você já cadastrou produção e `http://localhost:5173/auth/callback`. A 5173 não é a porta deste computador. Acrescente a 8080 se ela não estiver na lista. Não apague as que já funcionam em produção.

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL:** `https://lotsbi.leandromajr.com`
3. Em **Redirect URLs**, estas três precisam existir:
   - `https://lotsbi.leandromajr.com/auth/callback`
   - `https://lotsbi.leandromajr.com/auth`
   - `http://localhost:8080/auth/callback`
4. Salvar.

O convite local volta para `http://localhost:8080/auth/callback` porque é o `APP_URL` do `.env`. O convite do site no ar volta para `https://lotsbi.leandromajr.com/auth/callback` quando a Vercel tem esse `APP_URL`.

## 7. Depois — app da Meta ativo

Faça quando um negócio de fora precisar autorizar anúncio ou Instagram. Até lá, só conta de testador do app consegue conectar.

1. Abra [developers.facebook.com](https://developers.facebook.com/) no app cujo ID já está em `META_APP_ID`. Não crie outro app.
2. **Configurações** → **Básico**. Domínio `lotsbi.leandromajr.com` e a URL da política de privacidade.
3. **Facebook Login** → **Configurações** → **URIs de redirecionamento OAuth válidos**:
   - `https://lotsbi.leandromajr.com/oauth/meta/callback`
   - `http://localhost:8080/oauth/meta/callback` se for testar nesta máquina
4. Em cada produto usado (Facebook Login, Instagram, Marketing API), conclua a **App Review** dos usos que o cliente de fora precisa: anúncios, Instagram e publicação.
5. Mude o app de **Em desenvolvimento** para **Ativo**.
6. Não troque `META_APP_ID` nem `META_APP_SECRET` se o site já usa esse app.

## 8. Depois — e-mail próprio

Só depois do app da Meta. Até lá o convite continua saindo pelo Supabase.

1. Crie o envio transacional (Resend ou Postmark) no domínio do produto.
2. Supabase → **Authentication** → **Emails** → **SMTP Settings**. Ligue o SMTP com host, porta, usuário e senha que o provedor mostrar.
3. O remetente tem de ser um endereço desse domínio.
4. Envie um convite de teste para um e-mail seu. O link deve abrir `https://lotsbi.leandromajr.com/auth/callback`.

## O que não se resolve nestas telas

Isto é código, não console:

- A tela de novo usuário ainda só oferece Cliente e Administrador. Gestor de tráfego e social media existem no banco, mas a tela não deixa escolhê-los.
- TikTok no painel do cliente ainda é uma página vazia. YouTube ainda não tem página de métricas do cliente. A coleta no hub é outra coisa: ela já está escrita e passa a rodar no passo 1 e no passo 5.
- Checkout, nota fiscal e pagamento ficam como estão. Não faça nada nessa parte.

## O que devolver no chat

Sem colar segredo.

- Passo 1 feito: o login público mostra pedir acesso.
- Passo 2: as duas URIs de callback do Google salvas (produção e `localhost:8080`), e o Gmail de teste incluído se o app seguir em Testando.
- Passo 4: o status que a tela do developer token mostrar (Test, Basic ou Standard).
- Passo 5: quando o SMS funcionar, diga só que ID, secret e os dois redirects do TikTok foram salvos e que a Vercel foi republicada.
