import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { visualizer } from "rollup-plugin-visualizer";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(async ({ command, mode }) => {
  const viteEnv = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(viteEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const plugins = [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error" as const,
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
  ];

  if (command === "build") {
    plugins.push(
      nitro({
        preset: "vercel",
        vercel: {
          functions: {
            runtime: "nodejs24.x",
          },
        },
      }),
    );
  }

  plugins.push(
    react(),
    visualizer({
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  );

  return {
    define: envDefine,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: "127.0.0.1",
      port: 8080,
      watch: {
        awaitWriteFinish: {
          stabilityThreshold: 1000,
          pollInterval: 100,
        },
      },
    },
    plugins,
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            const norm = id.replace(/\\/g, "/");
            if (norm.includes("/react-dom/") || /\/react\//.test(norm)) return "react-vendor";
            if (norm.includes("/@tanstack/") || norm.includes("/tanstack-")) return "tanstack";
            if (norm.includes("/@supabase/")) return "supabase";
            if (norm.includes("/@radix-ui/")) return "radix";
            if (norm.includes("/cmdk/")) return "cmdk";
            if (norm.includes("/fuse.js/")) return "fuse";
            if (norm.includes("/recharts/")) return "recharts";
            if (norm.includes("/mermaid/")) return "mermaid";
          },
        },
      },
    },
  };
});
