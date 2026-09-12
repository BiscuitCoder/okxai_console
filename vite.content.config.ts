import { defineConfig } from "vite";
export default defineConfig({
  publicDir: false,
  build: {
    emptyOutDir: false,
    lib: {
      entry: "src/content.ts",
      name: "OnchainConsole",
      formats: ["iife"],
      fileName: () => "content.js",
    },
  },
});
