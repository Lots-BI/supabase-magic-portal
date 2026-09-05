---
title: Content Workflow — UI
description: Componentes, visualizações e UX do módulo Aprovações (Workflow de Conteúdo).
status: living
owner: Engenharia / Produto Lots BI
last_review: 2026-07-05
---

# Content Workflow — UI

**Nome visível:** Aprovações  
**Inspiração:** Notion, Linear, ClickUp, Trello, Instagram — **nunca** aparência de ERP.

---

## Layout

- `AppShell` existente + tabs estilo Linear
- Tokens CSS por coluna: `--cw-col-producao`, `--cw-col-edicao`, etc.
- Dark mode nativo

---

## Visualizações

### Kanban (default)

- `@dnd-kit/core` — drag entre colunas
- Mobile: `MobileStatusPicker` (sem DnD)
- Card compacto: título, cliente, responsável, rede, formato, data/hora, pilar, preview mídia
- Persistência automática via `moveCard`

### Calendário (admin)

- Grid mensal — mesmos cards do Kanban
- Click abre drawer de detalhe

### Pilares / Stories

- Pilares: lista ordenável com cor
- Stories: grid editável estilo planilha (dias × semana)

### Biblioteca

- Cards publicados/arquivados
- Filtros: plataforma, cliente, responsável, período
- Read-only para cliente

---

## Card Detail Drawer

Seções:

| Seção       | Campos / ações                                                         |
| ----------- | ---------------------------------------------------------------------- |
| Meta        | título, cliente, responsável, rede, formato, data, hora, status, pilar |
| Conteúdo    | copy, legenda, roteiro, direção de arte, CTA, observações              |
| Checklist   | inline editável (admin/SM)                                             |
| Preview     | `SocialPreviewPanel` → `MediaPreview`                                  |
| Timeline    | `CardTimeline` — eventos cronológicos automáticos                      |
| Comentários | input + thread (eventos `commented`)                                   |
| Anexos      | upload na criação + gestão posterior                                   |
| Histórico   | snapshots legados + diff                                               |

### Preview social

Registry plataforma × formato:

- Instagram: feed, reel, carrossel, story
- TikTok: vertical
- Facebook: post
- Fallback genérico (LinkedIn, etc.)

---

## Timeline (dentro do Card)

Componente `CardTimeline` lê `content_card_events`:

```
João criou o Card                    há 2 dias
Maria alterou a legenda              há 1 dia
Cliente comentou: "Ajustar CTA"      há 5 h
Cliente aprovou                      há 2 h
Ana publicou                         há 30 min
```

Avatar + nome + ação + timestamp relativo. Imutável — sem edit/delete.

---

## Permissões na UI

Controles renderizados conforme `resolveCardAction()` — esconder ≠ autorizar (server valida).

Cliente: Kanban read-only, botões aprovar/reprovar/comentar apenas.

---

## Componentes (`src/components/lots/approval/`)

```
approval/
├── kanban/           KanbanBoard, KanbanColumn, KanbanCard, MobileStatusPicker
├── card/             CardDetailDrawer, CardCreateDialog, CardChecklist, CardTimeline
├── calendar/         ApprovalCalendar
├── pillars/          EditorialPillarsPanel
├── stories/          StoryPlanSheet
├── library/          ContentLibrary
├── preview/          SocialPreviewPanel (wrapper MediaPreview)
└── dashboard/        ApprovalOpsDashboard
```

**Reutilizar:** `MediaPreview/`, `ApprovalWorkflowCard`, `ApprovalTimeline`, modals existentes.

---

## Referências

- [Arquitetura](../02-architecture/content-workflow.md)
- [Dashboards](../06-dashboards/content-workflow.md)
