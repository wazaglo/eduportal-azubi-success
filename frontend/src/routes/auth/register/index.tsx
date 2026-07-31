import { component$, useSignal, useStore, $ } from "@builder.io/qwik";
import { Link, useNavigate } from "@builder.io/qwik-city";
import { GraduationCapIcon, EyeIcon, EyeOffIcon, GithubIcon, ChromeIcon } from "lucide-qwik";
import { Button } from "~/components/atoms/Button";
import { Input } from "~/components/atoms/Input";
import { validateRegisterForm } from "~/utils/validators";
import { useAuth } from "~/stores/auth-store";

export default component$(() => {
  const navigate = useNavigate();
  const auth = useAuth();
  const showPassword = useSignal(false);
  const formData = useStore({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student" as "student" | "admin",
  });
  const errors = useStore<Record<string, string>>({});
  const isSubmitting = useSignal(false);
  const submitError = useSignal("");
  const oauthNotice = useSignal("");

  const handleOAuth = $((provider: string) => {
    oauthNotice.value = `${provider} sign-up is not configured yet. Please use your email and password.`;
  });

  const handleSubmit = $(async () => {
    submitError.value = "";
    const validation = validateRegisterForm(formData);
    if (!validation.valid) {
      Object.assign(errors, validation.errors);
      return;
    }
    Object.assign(errors, {});
    isSubmitting.value = true;
    try {
      await auth.register(formData);
      navigate("/auth/verify");
    } catch (err: any) {
      submitError.value = err?.message || "Registration failed. Please try again.";
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
          <h1 class="text-2xl font-bold text-text-primary mb-2">Create your account</h1>
          <p class="text-text-muted">Start your learning journey with AI-powered support</p>
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
            preventdefault:submit
            onSubmit$={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            class="space-y-4"
          >
            <Input
              name="name"
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              error={errors.name}
              required
              autocomplete="name"
              onInput$={(val) => {
                formData.name = val;
                delete errors.name;
              }}
            />

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
              <label for="reg-password" class="text-sm font-medium text-text-primary block mb-1.5">
                Password <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword.value ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  required
                  autocomplete="new-password"
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
                <p class="text-xs text-red-500 mt-1" role="alert">{errors.password}</p>
              )}
              <p class="text-xs text-text-muted mt-1">
                Must be at least 8 characters with uppercase, lowercase, and a number
              </p>
            </div>

            <div>
              <label for="reg-confirm-password" class="text-sm font-medium text-text-primary block mb-1.5">
                Confirm Password <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <input
                  id="reg-confirm-password"
                  name="confirmPassword"
                  type={showPassword.value ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={formData.confirmPassword}
                  required
                  autocomplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  onInput$={(e: any) => {
                    formData.confirmPassword = e.target.value;
                    delete errors.confirmPassword;
                  }}
                  class={[
                    "w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 pr-10",
                    "bg-surface text-text-primary placeholder:text-text-muted",
                    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                    errors.confirmPassword
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-border hover:border-primary-400",
                  ].join(" ")}
                />
              </div>
              {errors.confirmPassword && (
                <p class="text-xs text-red-500 mt-1" role="alert">{errors.confirmPassword}</p>
              )}
            </div>

            <div>
              <label class="text-sm font-medium text-text-primary block mb-1.5">
                I am a <span class="text-red-500">*</span>
              </label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick$={() => (formData.role = "student")}
                  class={[
                    "px-4 py-3 rounded-lg border text-sm font-medium transition-all",
                    formData.role === "student"
                      ? "bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"
                      : "border-border text-text-secondary hover:bg-surface-secondary",
                  ].join(" ")}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick$={() => (formData.role = "admin")}
                  class={[
                    "px-4 py-3 rounded-lg border text-sm font-medium transition-all",
                    formData.role === "admin"
                      ? "bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"
                      : "border-border text-text-secondary hover:bg-surface-secondary",
                  ].join(" ")}
                >
                  Admin
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" fullWidth loading={isSubmitting.value}>
              Create Account
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
              aria-label="Sign up with Google"
              onClick$={() => handleOAuth("Google")}
            >
              <ChromeIcon class="h-5 w-5" />
              Google
            </button>
            <button
              class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-surface-secondary transition-colors text-sm font-medium text-text-primary"
              aria-label="Sign up with GitHub"
              onClick$={() => handleOAuth("GitHub")}
            >
              <GithubIcon class="h-5 w-5" />
              GitHub
            </button>
          </div>
        </div>

        <p class="text-center mt-6 text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/auth/login" class="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
});
