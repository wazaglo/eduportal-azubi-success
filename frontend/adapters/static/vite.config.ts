import { extendConfig } from "@builder.io/qwik-city/vite";
import baseConfig from "../../vite.config";
import { staticAdapter } from "@builder.io/qwik-city/adapters/static/vite";

export default extendConfig(baseConfig, () => {
  return {
    build: {
      ssr: true,
      rollupOptions: {
        input: ["@qwik-city-plan", "src/entry.ssr.tsx"],
      },
    },
    plugins: [
      staticAdapter({
        origin: "https://eduportal.azubisuccess.space",
      }),
    ],
  };
});
