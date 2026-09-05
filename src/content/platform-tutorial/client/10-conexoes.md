---
title: Conexões
description: Conecte você mesmo sua conta do Instagram para alimentar os dashboards.
---

# Conexões (`/cliente/{slug}/conexoes`)

Aba onde você mesmo pode **conectar suas contas de redes sociais** à sua conta Lots BI —
sem depender da agência para autorizar o acesso.

> Por enquanto, disponível apenas para **Instagram** (publicações e insights de perfil), que é o
> que já validamos coletar 100% direto da Meta. Outras plataformas continuam sendo conectadas
> pela agência e vão entrar aqui conforme forem validadas.

## Como acessar

- Menu lateral → **Conexões** (ícone de plugue)
- URL direta: `/cliente/{seu-slug}/conexoes`

## Conectar o Instagram

1. Clique em **Conectar Instagram**.
2. Uma janela de login da Meta abre (popup). Faça login com a conta do **Facebook** que
   administra a **Página** vinculada ao seu perfil profissional do Instagram.
3. Autorize as permissões solicitadas.
4. Selecione a conta do **Instagram** que deve alimentar seus dashboards e clique em
   **Vincular**.

> Precisa ter um perfil Instagram **Business ou Creator** vinculado a uma **Página do
> Facebook**, e ser administrador dessa Página. Se não tiver certeza, fale com quem cuida das
> redes sociais da sua marca.

## Depois de conectado

- A aba mostra a conta vinculada com um ✔.
- Use **Refazer login** se o acesso expirar ou parar de sincronizar (normalmente a Meta pede
  isso a cada alguns meses).
- Atalhos diretos para o dashboard **Instagram** (perfil) e **Publicações** (posts).

Depois de conectar, use o botão **Puxar métricas** em cada dashboard para trazer os dados —
veja os capítulos **Plataformas de mídia** e **Publicações Instagram**.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
| ------- | -------------- | ------------ |
| Popup de login não abre | Bloqueador de popup do navegador | Libere popups para este site e tente novamente |
| "Nenhuma conta encontrada" | Perfil Instagram não é Business/Creator, ou não está vinculado a uma Página | Vincule o Instagram à Página no app Meta Business e refaça o login |
| Dashboards continuam vazios após conectar | Ainda não clicou em **Puxar métricas** | Vá até `/instagram` ou `/publicacoes` e use o botão |

## Próximo capítulo

Veja **Plataformas de mídia** e **Publicações Instagram** para acompanhar os números depois de
conectado.
