import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standalone CoMatch admin app. Independent of the user-facing frontend so it
// can outlive a frontend rewrite (e.g. when the React app moves to native).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
  },
});
