import { defineConfig } from "vite";

// base: "./" — относительные пути, чтобы ZIP для Яндекс Игр работал из любой директории
export default defineConfig({
  base: "./",
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: "es2020",
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
  },
});
