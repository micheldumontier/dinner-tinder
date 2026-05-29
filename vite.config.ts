import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  // On GitHub Pages the app is served from /<repo>/; locally from /.
  // The deploy workflow sets GITHUB_PAGES=true.
  base: process.env.GITHUB_PAGES ? "/dinner-tinder/" : "/",
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
  },
});
