import { component$, useStyles$ } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet, ServiceWorkerRegister } from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head";
import { ThemeProvider } from "./stores/theme-store";
import { AuthProvider } from "./stores/auth-store";
import { ChatProvider } from "./stores/chat-store";
import globalStyles from "./styles/global.css";

export default component$(() => {
  useStyles$(globalStyles);
  return (
    <QwikCityProvider>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <RouterHead />
      </head>
      <body lang="en" class="min-h-screen bg-surface text-text-primary antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <RouterOutlet />
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </QwikCityProvider>
  );
});
