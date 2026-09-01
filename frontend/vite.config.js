import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, requests to /api are forwarded to the backend on port 5000
// (see backend/server.js). In production, set VITE_API_BASE_URL instead
// (see frontend/.env.example) and this proxy is not used.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
