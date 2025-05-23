// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate", // Automatically registers and updates the service worker
      // Add your PWA icons to the 'public' folder and list them here
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "maskable-icon.png"],
      manifest: {
        name: "Vite PWA Media Uploader",
        short_name: "MediaUploader",
        description: "Upload media offline and sync when online",
        theme_color: "#007bff", // Defines the default theme color for the application
        background_color: "#f0f2f5", // Defines the expected background color for the web application
        display: "standalone", // Makes the PWA launch without browser UI
        start_url: "/", // The URL that loads when the PWA is launched
        icons: [
          {
            src: "/pwa-192x192.png", // Path to your 192x192 PWA icon in the public folder
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png", // Path to your 512x512 PWA icon in the public folder
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/maskable-icon-512x512.png", // Path to your maskable icon in the public folder
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable", // Important for adaptive icons on Android
          },
        ],
      },
      devOptions: {
        enabled: true, // Enable PWA in development for easier testing
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm}"], // Cache these assets
        navigateFallback: "/index.html",
        // You can add more specific runtime caching strategies here if needed
        // For example, to cache external images or API responses (but our offline queue handles uploads)
        // runtimeCaching: [
        //   {
        //     urlPattern: ({ url }) => url.origin === 'https://via.placeholder.com',
        //     handler: 'StaleWhileRevalidate',
        //     options: {
        //       cacheName: 'placeholder-images',
        //     },
        //   },
        // ],
      },
    }),
  ],
});
