import { component$, useSignal, useStore, $ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { GraduationCapIcon, ArrowLeftIcon, MailIcon, CheckCircle2Icon } from "lucide-qwik";
import { Button } from "~/components/atoms/Button";
import { Input } from "~/components/atoms/Input";
import { validateResetPasswordForm } from "~/utils/validators";
import { api } from "~/utils/api-client";

export default component$(() => {
  const email = useSignal("");
  const errors = useStore<Record<string, string>>({});
  const isSubmitting = useSignal(false);
  const isSubmitted = useSignal(false);
  const submitError = useSignal("");

  const handleSubmit = $(async () => {
    submitError.value = "";
    const validation = validateResetPasswordForm({ email: email.value });
    if (!validation.valid) {
      Object.assign(errors, validation.errors);
      return;
    }
    Object.assign(errors, {});
    isSubmitting.value = true;
    try {
      await api.post("/auth/reset-password", { email: email.value });
      isSubmitting.value = false;
      isSubmitted.value = true;
    } catch (err: any) {
      submitError.value = err?.message || "Failed to send reset link. Please try again.";
      isSubmitting.value = false;
    }
  });

  if (isSubmitted.value) {
    return (
      <div class="min-h-screen flex items-center justify-center px-4 py-12">
        <div class="w-full max-w-md text-center">
          <div class="rounded-2xl border border-border bg-surface p-8 sm:p-10">
            <div class="inline-flex items-center justify-center rounded-2xl bg-green-50 dark:bg-green-950/40 p-4 mb-6">
              <CheckCircle2Icon class="h-10 w-10 text-green-600" />
            </div>
            <h1 class="text-2xl font-bold text-text-primary mb-3">Check your email</h1>
            <p class="text-text-muted mb-6">
              If an account exists for <strong class="text-text-primary">{email.value}</strong>,
              you will receive a password reset link shortly.
            </p>
            <Link href="/auth/login">
              <Button variant="primary">
                <ArrowLeftIcon class="h-4 w-4" />
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 class="text-2xl font-bold text-text-primary mb-2">Reset your password</h1>
          <p class="text-text-muted">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <form
            preventdefault:submit
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
              value={email.value}
              error={errors.email}
              required
              autocomplete="email"
              onInput$={(val) => {
                email.value = val;
                delete errors.email;
              }}
            />

            <Button type="submit" variant="primary" fullWidth loading={isSubmitting.value}>
              <MailIcon class="h-4 w-4" />
              Send Reset Link
            </Button>

            {submitError.value && (
              <p class="text-sm text-red-600 text-center" role="alert">
                {submitError.value}
              </p>
            )}
          </form>
        </div>

        <p class="text-center mt-6">
          <Link href="/auth/login" class="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
            <ArrowLeftIcon class="h-4 w-4" />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
});
