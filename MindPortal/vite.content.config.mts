import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Content scripts can't be ES modules, so the content script (with React + the panel) is built
// separately as one self-contained IIFE file.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  resolve: { alias: { "@": resolve(import.meta.dirname, "src/panel"), "@shared": resolve(import.meta.dirname, "src/shared") } },
  build: {
    outDir: "dist/content",
    emptyOutDir: false,
    target: "chrome110",
    minify: true,
    lib: {
      entry: resolve(import.meta.dirname, "src/content/content-script.ts"),
      formats: ["iife"],
      name: "MindPortalContent",
      fileName: () => "content-script.js",
    },
  },
});
