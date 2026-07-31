import { component$, useSignal, useStore, $ } from "@builder.io/qwik";
import { Link, useNavigate } from "@builder.io/qwik-city";
import { GraduationCapIcon, EyeIcon, EyeOffIcon, GithubIcon, ChromeIcon } from "lucide-qwik";
import { Button } from "~/components/atoms/Button";
import { Input } from "~/components/atoms/Input";
import { validateLoginForm } from "~/utils/validators";
import { useAuth } from "~/stores/auth-store";

export default component$(() => {
  const navigate = useNavigate();
  const auth = useAuth();
  const showPassword = useSignal(false);
  const formData = useStore({ email: "", password: "" });
  const errors = useStore<Record<string, string>>({});
  const isSubmitting = useSignal(false);
  const submitError = useSignal("");
  const oauthNotice = useSignal("");

  const handleOAuth = $((provider: string) => {
    oauthNotice.value = `${provider} sign-in is not configured yet. Please use your email and password.`;
  });

  const handleSubmit = $(async () => {
    submitError.value = "";
    const validation = validateLoginForm(formData);
    if (!validation.valid) {
      Object.assign(errors, validation.errors);
      return;
    }
    Object.assign(errors, {});
    isSubmitting.value = true;
    try {
      await auth.login(formData.email, formData.password);
      navigate("/dashboard");
    } catch (err: any) {
      submitError.value = err?.message || "Invalid email or password. Please try again.";
    } finally {
      isSubmitting.value = false;
    }
  });

  return (
    <div class="min-h-screen flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <Link href="/" class="inline-flex items-center gap-2 mb-6">
            <div class="rounded-xl bg-primary-600 p-2">
              <GraduationCapIcon class="h-6 w-6 text-white" />
            </div>
            <span class="font-bold text-2xl text-text-primary">Azubi Success</span>
          </Link>
          <h1 class="text-2xl font-bold text-text-primary mb-2">Welcome back</h1>
          <p class="text-text-muted">Sign in to your account to continue</p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          {submitError.value && (
            <div class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400" role="alert">
              {submitError.value}
            </div>
          )}
          {oauthNotice.value && (
            <div class="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400" role="alert">
              {oauthNotice.value}
            </div>
          )}

          <form
            onSubmit$={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            class="space-y-4"
          >
            <Input
              name="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              error={errors.email}
              required
              autocomplete="email"
              onInput$={(val) => {
                formData.email = val;
                delete errors.email;
              }}
            />

            <div>
              <label for="input-password" class="text-sm font-medium text-text-primary block mb-1.5">
                Password <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <input
                  id="input-password"
                  name="password"
                  type={showPassword.value ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  required
                  autocomplete="current-password"
                  aria-invalid={!!errors.password}
                  onInput$={(e: any) => {
                    formData.password = e.target.value;
                    delete errors.password;
                  }}
                  class={[
                    "w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 pr-10",
                    "bg-surface text-text-primary placeholder:text-text-muted",
                    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                    errors.password
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-border hover:border-primary-400",
                  ].join(" ")}
                />
                <button
                  type="button"
                  onClick$={() => (showPassword.value = !showPassword.value)}
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  aria-label={showPassword.value ? "Hide password" : "Show password"}
                >
                  {showPassword.value ? <EyeOffIcon class="h-4 w-4" /> : <EyeIcon class="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="input-password-error" class="text-xs text-red-500 mt-1" role="alert">
                  {errors.password}
                </p>
              )}
              <div class="flex justify-end mt-1">
                <Link
                  href="/auth/reset-password"
                  class="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" variant="primary" fullWidth loading={isSubmitting.value}>
              Sign In
            </Button>
          </form>

          <div class="relative my-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-border" />
            </div>
            <div class="relative flex justify-center text-xs">
              <span class="bg-surface px-2 text-text-muted">or continue with</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <button
              class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-surface-secondary transition-colors text-sm font-medium text-text-primary"
              aria-label="Sign in with Google"
              onClick$={() => handleOAuth("Google")}
            >
              <ChromeIcon class="h-5 w-5" />
              Google
            </button>
            <button
              class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-surface-secondary transition-colors text-sm font-medium text-text-primary"
              aria-label="Sign in with GitHub"
              onClick$={() => handleOAuth("GitHub")}
            >
              <GithubIcon class="h-5 w-5" />
              GitHub
            </button>
          </div>
        </div>

        <p class="text-center mt-6 text-sm text-text-muted">
          Don't have an account?{" "}
          <Link href="/auth/register" class="text-primary-600 hover:text-primary-700 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
});
