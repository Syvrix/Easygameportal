import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy REST calls to the backend during development
      "/api": { target: "http://localhost:3001", changeOrigin: true },
      "/ws":  { target: "ws://localhost:3001",   ws: true },
    },
  },
  build: {
    // Output to backend/public so the Node server can serve the built frontend
    outDir: "../backend/public",
    emptyOutDir: true,
  },
});
