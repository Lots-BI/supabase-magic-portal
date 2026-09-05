---
title: Conexões
description: Conecte você mesmo sua conta do Instagram para alimentar os dashboards.
---

# Conexões (`/cliente/{slug}/conexoes`)

Aba onde você mesmo pode **conectar suas contas de redes sociais** à sua conta Lots BI —
sem depender da agência para autorizar o acesso.

> Por enquanto, disponível para **Instagram** (publicações e insights de perfil) e **Meta Ads**
> (métricas de campanha) — o que já validamos coletar 100% direto da Meta. Outras plataformas
> continuam sendo conectadas pela agência e vão entrar aqui conforme forem validadas.

## Como acessar

- Menu lateral → **Conexões** (ícone de plugue)
- URL direta: `/cliente/{seu-slug}/conexoes`

Cada plataforma liberada aparece como um **card independente** — você pode conectar uma, as
duas, ou nenhuma, sem afetar as outras.

## Conectar o Instagram

1. No card **Instagram**, clique em **Conectar Instagram**.
2. Uma janela de login da Meta abre (popup). Faça login com a conta do **Facebook** que
   administra a **Página** vinculada ao seu perfil profissional do Instagram.
3. Autorize as permissões solicitadas.
4. Selecione a conta do **Instagram** que deve alimentar seus dashboards e clique em
   **Vincular**.

> Precisa ter um perfil Instagram **Business ou Creator** vinculado a uma **Página do
> Facebook**, e ser administrador dessa Página. Se não tiver certeza, fale com quem cuida das
> redes sociais da sua marca.

## Conectar o Meta Ads

1. No card **Meta Ads**, clique em **Conectar Meta Ads**.
2. Faça login com a conta do **Facebook** que administra a conta de anúncios (Gerenciador de
   Anúncios).
3. Autorize as permissões solicitadas.
4. Selecione a **conta de anúncios** que deve alimentar o dashboard Meta Ads e clique em
   **Vincular**.

> Precisa ser administrador (ou ter acesso) da conta de anúncios no Gerenciador de Anúncios da
> Meta. Se não tiver certeza, fale com quem cuida das campanhas da sua marca.

## Depois de conectado

- Cada card mostra a conta vinculada com um ✔.
- Use **Refazer login** se o acesso expirar ou parar de sincronizar (normalmente a Meta pede
  isso a cada alguns meses).
- Atalhos diretos para os dashboards correspondentes (Instagram/Publicações, ou Meta Ads).

Depois de conectar, use o botão **Puxar métricas** em cada dashboard para trazer os dados —
veja os capítulos **Plataformas de mídia** e **Publicações Instagram**.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
| ------- | -------------- | ------------ |
| Popup de login não abre | Bloqueador de popup do navegador | Libere popups para este site e tente novamente |
| "Nenhuma conta encontrada" (Instagram) | Perfil Instagram não é Business/Creator, ou não está vinculado a uma Página | Vincule o Instagram à Página no app Meta Business e refaça o login |
| "Nenhuma conta encontrada" (Meta Ads) | Usuário sem acesso à conta de anúncios | Peça acesso à conta de anúncios no Gerenciador de Anúncios e refaça o login |
| Dashboards continuam vazios após conectar | Ainda não clicou em **Puxar métricas** | Vá até o dashboard correspondente e use o botão |

## Próximo capítulo

Veja **Plataformas de mídia** e **Publicações Instagram** para acompanhar os números depois de
conectado.
