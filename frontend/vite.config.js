import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      manifest: {
        name: "MediSync AI",
        short_name: "MediSync",
        description: "Offline-first healthcare documentation assistant",
        theme_color: "#0d6efd",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
      },

      workbox: {
        navigateFallback: "/index.html",
      },
    }),
  ],
});
