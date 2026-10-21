import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi", ".vercel", "src/routeTree.gen.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Dívida documentada em admin.functions.ts — warn até tipagem Supabase gerada (roadmap Fase 2)
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  eslintPluginPrettier,
  {
    files: ["src/routes/auth/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/modules/access",
              message:
                "Regra de Ouro: rotas Auth importam apenas o orchestrator (@/modules/access/post-auth-orchestrator.server), nunca o barrel access.",
            },
            {
              name: "@/features/access",
              message: "Auth não importa features/access — use o orchestrator.",
            },
            {
              name: "@/lib/admin.functions",
              message: "Auth não decide admin — use postAuthOnLoginSuccess.",
            },
          ],
          patterns: [
            {
              group: ["@/lib/access.functions.server"],
              message:
                "Rotas Auth usam @/modules/access/post-auth-orchestrator.server, não access.functions.server diretamente.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/auth/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/modules/access",
              message:
                "Princípio Nº1: modules/auth não importa access — use orchestrator via rotas.",
            },
            {
              name: "@/features/access",
              message: "modules/auth não importa features/access.",
            },
            {
              name: "@/lib/access.functions.server",
              message: "modules/auth não consulta Postgres da aplicação.",
            },
            {
              name: "@/lib/admin.functions",
              message: "modules/auth não decide admin.",
            },
          ],
          patterns: [
            {
              group: ["@/modules/access/**", "@/modules/access/internal/**"],
              message: "modules/auth não importa módulo access.",
            },
          ],
        },
      ],
    },
  },
);
