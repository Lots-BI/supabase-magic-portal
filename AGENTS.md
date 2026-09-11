<!-- LOTUS:BEGIN -->

> [!IMPORTANT]
> **Engenharia oficial Lots BI:** desenvolvimento no **Cursor** + repositório Git.
> **Setup local:** [SETUP.md](./SETUP.md) · `npm run setup`
> **Sistema de Engenharia:** `docs/00-company/engineering-system.md` · `npm run check`
>
> Fluxo: Cursor → Commit → GitHub → CI → Deploy → Portal Lots BI
>
> **Plano de ingestão (esta branch `feat/hub-ingest-plan`):** [docs/13-execution/AGENT-PLAN.md](./docs/13-execution/AGENT-PLAN.md)
>
> **Transição interna:** Lovable e Horizons estão sendo desacoplados (ADR-0012).
> Implemente **sempre** neste repo — não no editor Lovable.
>
> Contribuir: [CONTRIBUTING.md](./CONTRIBUTING.md)

<!-- LOTUS:END -->

<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
>
> **Lots BI policy:** Lovable is **build/deploy only** until Cloudflare deploy is validated.
> Do not implement features in the Lovable editor.

<!-- LOVABLE:END -->
