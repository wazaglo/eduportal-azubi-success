import {
  component$,
  Slot,
  createContextId,
  useContextProvider,
  useContext,
  useSignal,
  useVisibleTask$,
  type Signal,
} from "@builder.io/qwik";

export interface ThemeState {
  isDark: Signal<boolean>;
}

export const ThemeContext = createContextId<ThemeState>("theme-context");

export function useTheme(): ThemeState {
  return useContext(ThemeContext);
}

export const ThemeProvider = component$(() => {
  const isDark = useSignal(false);

  useVisibleTask$(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      isDark.value = true;
      document.documentElement.classList.add("dark");
    }
  });

  useVisibleTask$(({ track }) => {
    track(() => isDark.value);
    if (isDark.value) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  });

  useContextProvider(ThemeContext, { isDark });

  return <Slot />;
});

export function toggleTheme(isDark: Signal<boolean>) {
  isDark.value = !isDark.value;
}
