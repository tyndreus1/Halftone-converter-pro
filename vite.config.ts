import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Use relative asset paths in production so the built site works from any
  // sub-path (e.g. GitHub Pages project sites at /<repo>/), while the dev
  // server keeps an absolute base.
  base: mode === "production" ? "./" : "/",
  server: {
    host: true,
    port: 5173,
  },
}));
