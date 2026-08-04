---
title: Marco 3 — UX operação diária
description: Melhorias de usabilidade admin/cliente em cima do Hub legível e do Content Workflow.
status: living
owner: Engenharia Lots BI
tags: [ux, marco-3, operacoes]
difficulty: intermediate
last_review: 2026-08-04
---

# Marco 3 — UX operação diária

**Depende de:** Hub legível (Marco 1) + scheduler disponível (Marco 2 prep).  
**Não inclui:** cutover `active_source`, publish Meta, SaaS, LP framework.

## Rotina sugerida (ops)

| Momento | Onde | Ação |
|---------|------|------|
| Manhã | `/admin/central` | Alertas Hub + fila Agency OS |
| Manhã | `/admin/conexoes` → filtro **Precisa atenção** | Sync falho / atrasado / health |
| Dia | `/admin/aprovacoes` | Badge na nav = aguardando aprovação |
| Sync | CLI ou detalhe da conexão | `npm run hub:sync-official -- --eligible` |
| Cliente | `/cliente/...` | SyncStatusBar deixa claro que a fonte ainda é Make |

## Entregas neste marco (código)

- Badges na sidebar: Conexões (alertas) e Aprovações (aguardando)
- Lista de Conexões com destaque + filtro “Precisa atenção”
- Kanban mobile: seletor de status sem depender de drag-and-drop
- SyncStatusBar: nota de fonte Make até cutover

## Fora deste marco

- Flip `ph_metricas_source` → hub
- Publish / agendamento de posts (Marco 4)
- Inbox cross-client de aprovações (backlog)
- Framework LP + tracking (Marco 7)
