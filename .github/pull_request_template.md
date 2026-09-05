## Resumo

<!-- O que mudou e por quê (1–3 frases) -->

## Tipo de mudança

- [ ] Feature
- [ ] Correção
- [ ] Refatoração
- [ ] Documentação
- [ ] Infra / CI
- [ ] Dados (migration)

## Checklist — Sistema de Engenharia Lots BI

### Código

- [ ] `npm run check` passa localmente (lint + test + build)
- [ ] Tipagem limpa; sem imports mortos ou TODOs esquecidos
- [ ] Lógica de negócio em `src/lib/` — componentes só exibem
- [ ] Fórmulas só em `formulas.ts` (se aplicável)

### Documentação (obrigatório se comportamento mudou)

- [ ] Atualizei `docs/` conforme [matriz](../docs/09-standards/documentation.md)
- [ ] `last_review` atualizado nos docs tocados
- [ ] Entrada no [Changelog](../docs/12-changelog/changelog.md) se visível ao usuário

### Arquitetura

- [ ] Criei [ADR](../docs/02-architecture/adr/) se decisão estrutural
- [ ] Diferenciei estado atual vs visão futura (se aplicável)

### Banco (se aplicável)

- [ ] Migration aditiva e idempotente em `supabase/migrations-official/`
- [ ] Atualizei `docs/04-database/` (schema, views, migrations, RLS)

## Test plan

<!-- Como validar manualmente -->
