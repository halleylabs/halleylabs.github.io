import { defineConfig } from "astro/config";
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  site: "https://halleylabs.dev",
  devToolbar: { enabled: false },
  trailingSlash: "always",
  build: { format: "directory", inlineStylesheets: "auto" },
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  vite: { plugins: [tailwind()] },
});
