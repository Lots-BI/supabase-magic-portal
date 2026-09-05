---
title: "ADR-0012: Transição para Infraestrutura Interna Lots BI"
status: accepted
date: 2026-06-26
deciders: Engenharia Lots BI
---

# ADR-0012: Transição para Infraestrutura Interna Lots BI

## Contexto

O Lots BI evoluiu de protótipo Lovable para produto com:

- Engenharia oficial no **Cursor + Git** (ADR-0010)
- Sistema de Engenharia com CI (ADR-0011)
- Knowledge Center nativo no admin

Permanecem dependências **transitórias**:

- `@lovable.dev/vite-tanstack-config` (build)
- Deploy via Lovable → Nitro → Cloudflare
- Bridge de erros `window.__lovableEvents`
- Prefixo de env `OFFICIAL_` (reserva Lovable)

A visão estratégica (ADR-0009) é **infraestrutura proprietária**, sem Lovable, Make ou
ferramentas externas de prototipagem. **Horizons** e **leandromajr.com** não fazem parte
deste repositório — serão desacoplados em projetos futuros conforme o Lots BI amadurecer.

## Decisão

Adotar transição **faseada e sem ruptura**:

1. **Manter** preset Lovable no build até deploy proprietário validado em produção.
2. **Adicionar** pipeline paralelo GitHub Actions → Cloudflare (`deploy.yml`, `deploy:cloudflare`).
3. **Generalizar** observabilidade client (`error-reporting.ts`) com bridge Lovable como fallback.
4. **Documentar** setup interno (`SETUP.md`, `npm run setup`).
5. **Desconectar Lovable** somente após N deploys estáveis pelo pipeline Lots BI.

## Alternativas consideradas

| Alternativa                            | Por que não agora                      |
| -------------------------------------- | -------------------------------------- |
| Remover Lovable imediatamente          | Quebra deploy de produção              |
| Manter Lovable indefinidamente         | Contraria ADR-0009 e controle de infra |
| Migrar para Vercel antes de Cloudflare | Nitro já gera target Cloudflare        |

## Consequências

### Positivas

- Time trabalha 100% no repo sem bloqueio operacional.
- Caminho claro para independência de Lovable e Horizons.
- Deploy reproduzível via GitHub Actions.

### Negativas / riscos

- Duplicidade temporária de pipelines (Lovable + Cloudflare).
- Secrets devem ser mantidos em dois lugares até cutover.
- Remoção do preset exige teste extensivo (Fase 6).

## Checklist de cutover (Lovable → Lots BI)

- [x] Dev oficial Cursor + Git
- [x] CI completo (`npm run check`)
- [x] `SETUP.md` e `npm run setup`
- [x] Workflow deploy Cloudflare (manual)
- [x] `reportClientError` genérico
- [ ] Deploy Cloudflare validado em produção
- [ ] Secrets migrados para GitHub + Cloudflare
- [ ] Remover `@lovable.dev/vite-tanstack-config`
- [ ] Desconectar projeto Lovable do Git
- [ ] Remover bloco `LOVABLE` de `AGENTS.md`
- [ ] Renomear `OFFICIAL_*` → `SUPABASE_*` (opcional, pós-Lovable)

## Referências

- [ADR-0009](./0009-platform-proprietary-infrastructure.md)
- [ADR-0010](./0010-cursor-official-development-environment.md)
- [Deployment](../../08-operations/deployment.md)
- [SETUP.md](../../../SETUP.md)
