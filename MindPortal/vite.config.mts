import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { copyFileSync, mkdirSync, readdirSync } from "fs";

// Simple plugin to copy static extension files after build
function copyExtensionFiles(): import("vite").Plugin {
  return {
    name: "copy-extension-files",
    closeBundle() {
      // Copy manifest.json
      copyFileSync("manifest.json", "dist/manifest.json");

      // Copy icons
      mkdirSync("dist/assets/icons", { recursive: true });
      for (const file of readdirSync("src/assets/icons")) {
        copyFileSync(`src/assets/icons/${file}`, `dist/assets/icons/${file}`);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), copyExtensionFiles()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        "service-worker": resolve(import.meta.dirname, "src/background/service-worker.ts"),
        popup: resolve(import.meta.dirname, "src/popup/index.html"),
        options: resolve(import.meta.dirname, "src/options/index.html"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "service-worker") return "background/service-worker.js";
          return "[name]/[name].js";
        },
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
    target: "chrome110",
    minify: false,
  },
  resolve: {
    alias: {
      "@shared": resolve(import.meta.dirname, "src/shared"),
      "@": resolve(import.meta.dirname, "src/panel"),
    },
  },
});
