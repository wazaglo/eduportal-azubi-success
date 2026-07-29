import { component$, Slot, useSignal } from "@builder.io/qwik";
import { Link, useLocation } from "@builder.io/qwik-city";
import { GraduationCapIcon, MenuIcon, XIcon, MoonIcon, SunIcon, MessageSquareIcon, WandIcon, ShieldIcon, BarChart3Icon } from "lucide-qwik";
import { useTheme } from "~/stores/theme-store";
import { Button } from "~/components/atoms/Button";

export default component$(() => {
  const theme = useTheme();
  const location = useLocation();
  const mobileMenuOpen = useSignal(false);
  const isAuthPage = location.url.pathname.startsWith("/auth");
  const isDashboard = location.url.pathname.startsWith("/dashboard") || location.url.pathname.startsWith("/admin");

  if (isDashboard) {
    return <Slot />;
  }

  return (
    <div class="min-h-screen bg-surface">
      <header class="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <Link href="/" class="flex items-center gap-2.5">
              <div class="rounded-xl bg-primary-600 p-2">
                <GraduationCapIcon class="h-5 w-5 text-white" />
              </div>
              <span class="font-bold text-xl text-text-primary">Azubi Success</span>
            </Link>

            <nav class="hidden md:flex items-center gap-1" aria-label="Main navigation">
              <Link href="/#features" class="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-secondary transition-colors">
                Features
              </Link>
              <Link href="/#about" class="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-secondary transition-colors">
                About
              </Link>
              <Link href="/auth/login" class="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-secondary transition-colors">
                Sign In
              </Link>
              <Link href="/auth/register" class="ml-2">
                <Button variant="primary" size="sm">Get Started</Button>
              </Link>
              <button
                onClick$={() => (theme.isDark.value = !theme.isDark.value)}
                class="ml-2 p-2 rounded-lg hover:bg-surface-secondary transition-colors text-text-secondary"
                aria-label="Toggle theme"
              >
                {theme.isDark.value ? <SunIcon class="h-5 w-5" /> : <MoonIcon class="h-5 w-5" />}
              </button>
            </nav>

            <button
              onClick$={() => (mobileMenuOpen.value = !mobileMenuOpen.value)}
              class="md:hidden p-2 rounded-lg hover:bg-surface-secondary transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen.value ? <XIcon class="h-5 w-5" /> : <MenuIcon class="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen.value && (
          <nav class="md:hidden border-t border-border bg-surface p-4 space-y-1" aria-label="Mobile navigation">
            <Link href="/#features" class="block px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-secondary" onClick$={() => (mobileMenuOpen.value = false)}>
              Features
            </Link>
            <Link href="/#about" class="block px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-secondary" onClick$={() => (mobileMenuOpen.value = false)}>
              About
            </Link>
            <Link href="/auth/login" class="block px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-secondary" onClick$={() => (mobileMenuOpen.value = false)}>
              Sign In
            </Link>
            <Link href="/auth/register" class="block px-4 py-3" onClick$={() => (mobileMenuOpen.value = false)}>
              <Button variant="primary" fullWidth>Get Started</Button>
            </Link>
            <button
              onClick$={() => (theme.isDark.value = !theme.isDark.value)}
              class="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-secondary"
            >
              {theme.isDark.value ? <SunIcon class="h-4 w-4" /> : <MoonIcon class="h-4 w-4" />}
              {theme.isDark.value ? "Light Mode" : "Dark Mode"}
            </button>
          </nav>
        )}
      </header>

      <main>
        <Slot />
      </main>

      <footer class="border-t border-border bg-surface-secondary">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div class="col-span-1 md:col-span-2">
              <Link href="/" class="flex items-center gap-2 mb-4">
                <div class="rounded-lg bg-primary-600 p-1.5">
                  <GraduationCapIcon class="h-5 w-5 text-white" />
                </div>
                <span class="font-bold text-lg text-text-primary">Azubi Success</span>
              </Link>
              <p class="text-sm text-text-muted max-w-sm">
                Empowering students with AI-driven academic support. Get help with homework, exam prep, and more.
              </p>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-text-primary mb-3">Product</h3>
              <ul class="space-y-2">
                <li><Link href="/#features" class="text-sm text-text-secondary hover:text-text-primary transition-colors">Features</Link></li>
                <li><Link href="/auth/register" class="text-sm text-text-secondary hover:text-text-primary transition-colors">Get Started</Link></li>
                <li><Link href="/auth/login" class="text-sm text-text-secondary hover:text-text-primary transition-colors">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-text-primary mb-3">Support</h3>
              <ul class="space-y-2">
                <li><a href="#" class="text-sm text-text-secondary hover:text-text-primary transition-colors">Help Center</a></li>
                <li><a href="#" class="text-sm text-text-secondary hover:text-text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" class="text-sm text-text-secondary hover:text-text-primary transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div class="mt-8 pt-8 border-t border-border">
            <p class="text-sm text-text-muted text-center">
              &copy; {new Date().getFullYear()} Azubi Success. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
});
