import { defineConfig, type UserConfig } from "vite";
export default defineConfig(({ mode }): UserConfig => ({
  base: "./",
  build: {
    outDir: mode === "web" ? "dist-web" : "dist",
    rollupOptions: {
      input:
        mode === "web"
          ? { sidepanel: "index.html" }
          : { sidepanel: "index.html", background: "src/background.ts" },
      output: { entryFileNames: "[name].js" },
    },
  },
}));
