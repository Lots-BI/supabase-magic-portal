import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
  },
  vite: {
    plugins: [
      visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
    ],
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
  },
});