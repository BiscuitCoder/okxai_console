import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: { sidepanel: "index.html", background: "src/background.ts" },
      output: { entryFileNames: "[name].js" },
    },
  },
});
