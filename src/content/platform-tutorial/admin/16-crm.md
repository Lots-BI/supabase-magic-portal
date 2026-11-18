---
title: CRM — audiência da marca
description: Caixa de entrada. Direct e comentários pela Graph no Lots, sem ManyChat.
---

# CRM (`/admin/crm`)

A aba **CRM** (Dados, acima de Relatórios) é a caixa de entrada da audiência de cada cliente.

1. Abra o portfólio em `/admin/crm`.
2. Clique na marca → ficha em `/cliente/{slug}/crm`.
3. Home = **Caixa de entrada**. Tabs **Em risco** / **Todas**.
4. **Puxar Instagram** lê comentários e Direct da Graph (sem ManyChat).
5. Direct: no App Dashboard Meta ligue o caso de uso **Mensagens**, `META_REQUEST_IG_MESSAGES_SCOPE=1`, **Refazer login**.
6. Token de API é só para formulário do próprio site. Copie na hora.
7. Ficha: responder comentário ou Direct, atribuir dono, unir duplicados.

E-mail **não** vem do texto. Custom Audience Meta recusa IGSID.

## Central de Leads (`/admin/leads`)

A aba **Formulários** do CRM mostra o lead ao lado da pessoa. Para ver todos os leads de
um cliente — landing e formulário instantâneo de campanha da Meta — num recorte dedicado
com KPIs e filtros, use **Central de Leads** em Dados (`/admin/leads` no hub,
`/cliente/{slug}/leads` no detalhe). O botão **Abrir ficha no CRM** volta para a pessoa.

Doc: Knowledge Center → **CRM de audiência**.
