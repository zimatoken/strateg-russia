import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/strateg-russia/", // 👈 ГЛАВНОЕ ИСПРАВЛЕНИЕ — для GitHub Pages
  test: {
    environment: "happy-dom",
    setupFiles: "./tests/setup.ts",
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    // Опционально: можно уменьшить размер чанков
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
