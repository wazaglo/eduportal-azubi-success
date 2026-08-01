import { component$, useSignal } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";
import { MoonIcon, SunIcon, BellIcon, MenuIcon, GraduationCapIcon } from "lucide-qwik";
import { useTheme } from "~/stores/theme-store";
import { Avatar } from "../atoms/Avatar";
import { useAuth } from "~/stores/auth-store";

export interface HeaderProps {
  onMenuToggle$: () => void;
  class?: string;
}

export const Header = component$<HeaderProps>(({ onMenuToggle$, class: className }) => {
  const theme = useTheme();
  const auth = useAuth();
  const location = useLocation();
  const notificationsOpen = useSignal(false);

  const getTitle = (): string => {
    const path = location.url.pathname;
    if (path === "/dashboard") return "Dashboard";
    if (path.startsWith("/dashboard/ask")) return "Ask a Question";
    if (path.startsWith("/dashboard/history")) return "History";
    if (path.startsWith("/dashboard/profile")) return "Profile";
    if (path.startsWith("/admin")) return "Admin Panel";
    if (path.startsWith("/auth/login")) return "Sign In";
    if (path.startsWith("/auth/register")) return "Create Account";
    return "Azubi Success";
  };

  return (
    <header
      class={[
        "sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-border",
        className,
      ].join(" ")}
    >
      <div class="flex items-center justify-between px-4 h-16">
        <div class="flex items-center gap-3">
          <button
            onClick$={onMenuToggle$}
            class="lg:hidden p-2 rounded-lg hover:bg-surface-secondary transition-colors"
            aria-label="Toggle menu"
          >
            <MenuIcon class="h-5 w-5 text-text-primary" />
          </button>
          <div class="flex items-center gap-2 lg:hidden">
            <GraduationCapIcon class="h-6 w-6 text-primary-600" />
            <span class="font-bold text-lg text-text-primary">Azubi Success</span>
          </div>
          <h1 class="text-lg font-semibold text-text-primary hidden sm:block">
            {getTitle()}
          </h1>
        </div>

        <div class="relative flex items-center gap-2">
          <button
            onClick$={() => (theme.isDark.value = !theme.isDark.value)}
            class="p-2 rounded-lg hover:bg-surface-secondary transition-colors text-text-secondary hover:text-text-primary"
            aria-label={theme.isDark.value ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme.isDark.value ? <SunIcon class="h-5 w-5" /> : <MoonIcon class="h-5 w-5" />}
          </button>

          <button
            onClick$={() => (notificationsOpen.value = !notificationsOpen.value)}
            class="p-2 rounded-lg hover:bg-surface-secondary transition-colors text-text-secondary hover:text-text-primary relative"
            aria-label="Notifications"
            aria-expanded={notificationsOpen.value}
          >
            <BellIcon class="h-5 w-5" />
            <span class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface" />
          </button>

          {notificationsOpen.value && (
            <div class="absolute right-0 top-12 z-40 w-80 rounded-2xl border border-border bg-surface shadow-lg overflow-hidden">
              <div class="px-4 py-3 border-b border-border">
                <p class="text-sm font-semibold text-text-primary">Notifications</p>
              </div>
              <div class="p-4 text-sm text-text-muted">
                No new notifications yet. You'll be notified here about replies and system updates.
              </div>
            </div>
          )}

          {auth.state.user && (
            <div class="flex items-center gap-2 pl-2 border-l border-border">
              <Avatar
                name={auth.state.user.name}
                src={auth.state.user.avatar}
                size="sm"
              />
              <span class="text-sm font-medium text-text-primary hidden sm:block">
                {auth.state.user.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});
