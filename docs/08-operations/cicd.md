---
title: CI/CD
description: Pipeline de integração e deploy — GitHub Actions, gates e deploy futuro.
status: living
owner: Engenharia / Ops Lots BI
last_review: 2026-06-26
---

# CI/CD

---

## Estado atual

| Item                   | Status                               |
| ---------------------- | ------------------------------------ |
| GitHub Actions         | ✅ `.github/workflows/ci.yml`        |
| Lint no PR             | ✅ `npm run lint`                    |
| Testes no PR           | ✅ `npm run test` (Vitest)           |
| Build no PR            | ✅ `npm run build`                   |
| Validação engenharia   | ✅ `npm run validate:engineering`    |
| Gate local             | ✅ `npm run check`                   |
| Deploy automático      | ❌ Manual (Lovable transitório)      |
| Deploy proprietário    | 🟡 Preparado — `deploy.yml` (manual) |
| Migrations automáticas | ❌ Manual no Supabase dashboard      |

---

## Pipeline implementado

```mermaid
flowchart LR
    PR["Pull Request"] --> VAL["validate:engineering"]
    VAL --> LINT["lint"]
    LINT --> TEST["test"]
    TEST --> BUILD["build"]
    BUILD --> MERGE["merge main"]
    MERGE --> DEPLOY["deploy\n(Lovable hoje)"]
```

### Workflow: `CI` (`.github/workflows/ci.yml`)

Dispara em `push` e `pull_request` para `main`.

| Step        | Comando                                  |
| ----------- | ---------------------------------------- |
| Install     | `npm ci`                                 |
| Engineering | `npm run validate:engineering`           |
| Lint        | `npm run lint`                           |
| Test        | `npm run test`                           |
| Build       | `npm run build` (env placeholders no CI) |

### Gate local

```bash
npm run check
# = validate:engineering + lint + test + build
```

Requer `.env` local para o passo `build` (ver `.env.example`).

---

## PR template

Checklist alinhado ao handbook: `.github/pull_request_template.md`

---

## Deploy

### Transitório (hoje)

Deploy de produção ainda via Lovable/Nitro/Cloudflare. Ver [Deployment](./deployment.md).

### Proprietário (preparado — ADR-0012)

Workflow **manual**: `.github/workflows/deploy.yml`

1. Configure secrets no GitHub: `CLOUDFLARE_API_TOKEN` + variáveis `OFFICIAL_*` / `VITE_OFFICIAL_*`
2. Actions → **Deploy (Cloudflare)** → confirmar com `deploy`
3. Local: `npm run build && npm run deploy:cloudflare`

> Mantenha Lovable ativo até validar paridade em produção.

### Pipeline alvo (pós-cutover)

```yaml
steps:
  - npm run check
  - deploy Cloudflare (secrets reais)
  - smoke test
```

Ver [ADR-0012](../02-architecture/adr/0012-internal-infrastructure-transition.md).

---

## Migrations

Gate **manual**: aplicar SQL no Supabase antes/depois do deploy conforme compatibilidade.
Ver [Migrations](../04-database/migrations.md).

---

## Referências

- [ADR-0011](../02-architecture/adr/0011-engineering-system-foundation.md)
- [Testing](../09-standards/testing.md)
- [Governança](../09-standards/governance.md)
