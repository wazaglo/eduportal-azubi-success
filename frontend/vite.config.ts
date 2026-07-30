import { defineConfig } from "vite";
import { qwikCity } from "@builder.io/qwik-city/vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(() => {
  return {
    plugins: [tailwindcss(), qwikCity(), qwikVite()],
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 8081,
      host: "0.0.0.0",
    },
    dev: {
      headers: {
        "Cache-Control": "public, max-age=0",
      },
    },
    preview: {
      port: 8081,
      headers: {
        "Cache-Control": "public, max-age=600",
      },
    },
  };
});
