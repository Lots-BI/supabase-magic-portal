---
title: "ADR-0009: Infraestrutura proprietária (sem ferramentas transitórias)"
status: proposed
date: 2026-06-26
deciders: Engenharia Lots BI / Liderança
---

# ADR-0009: Infraestrutura proprietária (sem ferramentas transitórias)

## Contexto

O Lots BI foi prototipada com ferramentas que aceleraram time-to-market:

| Ferramenta   | Uso observado                                                      |
| ------------ | ------------------------------------------------------------------ |
| **Lovable**  | Editor visual, sync de branch, `@lovable.dev/vite-tanstack-config` |
| **Make**     | Ingestão de dados (externo ao repo)                                |
| **Horizons** | Citado na visão estratégica — **não encontrado no repositório**    |

A visão de longo prazo é uma plataforma **100% proprietária**, onde toda inteligência
operacional e analítica reside no ecossistema Lots BI.

## Decisão (alvo)

1. **Desacoplar Lovable** quando o produto estiver estável: build/deploy CI próprio,
   remoção de dependências `@lovable.dev/*`, controle total de env e infra.
2. **Substituir Make** por coletores proprietários (ADR-0008).
3. **Não adotar** novas dependências operacionais críticas em ferramentas no-code/low-code
   sem ADR justificando exceção temporária.
4. Documentar e datar toda ferramenta transitória com critério de saída.

## Alternativas consideradas

| Alternativa                | Avaliação                                              |
| -------------------------- | ------------------------------------------------------ |
| Manter Lovable para sempre | Rápido, mas limita controle de infra e custo em escala |
| Rewrite completo           | Alto risco; migração incremental preferida             |

## Consequências

### Positivas

- Propriedade intelectual total do pipeline.
- CI/CD, testes e observabilidade unificados.
- Onboarding de devs sem dependência de plataformas externas de edição.

### Negativas

- Perda de velocidade de prototipação visual do Lovable.
- Necessidade de investir em pipeline de deploy (hoje parcialmente via Lovable/Nitro/Cloudflare).

## Estado de implementação

| Item                                | Status                                    |
| ----------------------------------- | ----------------------------------------- |
| Cursor como ambiente oficial de dev | ✅ ADR-0010                               |
| Dependência Lovable no build        | ✅ Ativa (`vite.config.ts`) — transitório |
| CI/CD documentado                   | ⚠️ INFORMAÇÃO NÃO ENCONTRADA              |
| Coletores proprietários             | ❌ Pendente                               |
| Make desligado                      | ❌ Não                                    |

## Critérios de saída do Lovable (recomendação)

- [ ] Pipeline CI (lint, test, build, deploy) no GitHub Actions ou equivalente.
- [ ] Ambientes staging/prod definidos e documentados.
- [x] Desenvolvimento de features no Cursor/repo, não no editor Lovable (ADR-0010, 2026-06-26).
- [ ] Remoção de `@lovable.dev/vite-tanstack-config` validada.

## Referências

- [Missão & Visão](../../00-company/mission.md)
- [Deploy](../../08-operations/deployment.md)
- [Roadmap Fase 4](../../11-roadmap/roadmap.md)
