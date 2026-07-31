import { component$, useSignal, $ } from "@builder.io/qwik";
import { Link, useNavigate } from "@builder.io/qwik-city";
import { MailIcon, ArrowLeftIcon, RefreshCwIcon, CheckCircle2Icon } from "lucide-qwik";
import { Button } from "~/components/atoms/Button";
import { Input } from "~/components/atoms/Input";
import { useAuth } from "~/stores/auth-store";
import { api } from "~/utils/api-client";

export default component$(() => {
  const navigate = useNavigate();
  const auth = useAuth();
  const email = useSignal(auth.state.pendingEmail || "user@example.com");
  const code = useSignal("");
  const resending = useSignal(false);
  const verifying = useSignal(false);
  const resent = useSignal(false);
  const error = useSignal("");
  const verified = useSignal(false);

  const handleResend = $(async () => {
    resending.value = true;
    error.value = "";
    try {
      await api.post("/auth/resend-verification-code", { email: email.value });
      resending.value = false;
      resent.value = true;
    } catch (err: any) {
      error.value = err?.message || "Failed to resend verification code.";
      resending.value = false;
    }
  });

  const handleVerify = $(async () => {
    verifying.value = true;
    error.value = "";
    try {
      await auth.verifyEmail(code.value);
      verified.value = true;
      await navigate("/auth/login");
    } catch (err: any) {
      error.value = err?.message || "Verification failed. Check the code and try again.";
    } finally {
      verifying.value = false;
    }
  });

  return (
    <div class="min-h-screen flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md text-center">
        <div class="rounded-2xl border border-border bg-surface p-8 sm:p-10">
          <div class="inline-flex items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/40 p-4 mb-6">
            <MailIcon class="h-10 w-10 text-primary-600" />
          </div>

          <h1 class="text-2xl font-bold text-text-primary mb-3">Check your email</h1>
          <p class="text-text-muted mb-6 leading-relaxed">
            We've sent a verification code to{" "}
            <strong class="text-text-primary">{email.value}</strong>
          </p>

          {resent.value ? (
            <div class="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 mb-6">
              <CheckCircle2Icon class="h-4 w-4 text-green-600" />
              <span class="text-sm text-green-600 dark:text-green-400 font-medium">
                Verification code sent!
              </span>
            </div>
          ) : null}

          {error.value ? (
            <div class="flex items-center justify-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 mb-6" role="alert">
              <span class="text-sm text-red-600 dark:text-red-400 font-medium">
                {error.value}
              </span>
            </div>
          ) : null}

          <div class="space-y-4 text-left">
            <Input
              name="code"
              label="Verification Code"
              type="text"
              placeholder="Enter the 6-digit code"
              value={code.value}
              onInput$={(val) => (code.value = val)}
            />
            <Button variant="primary" fullWidth loading={verifying.value} onClick$={handleVerify} disabled={!code.value}>
              <CheckCircle2Icon class="h-4 w-4" />
              Verify Email
            </Button>
          </div>

          <div class="space-y-3 mt-6">
            <Button variant="secondary" fullWidth loading={resending.value} onClick$={handleResend}>
              <RefreshCwIcon class="h-4 w-4" />
              Resend Verification Code
            </Button>

            <Link href="/auth/login">
              <Button variant="ghost" fullWidth>
                <ArrowLeftIcon class="h-4 w-4" />
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>

        <p class="text-xs text-text-muted mt-6">
          Didn't receive the email? Check your spam folder or{" "}
          <button onClick$={handleResend} class="text-primary-600 hover:text-primary-700 font-medium">
            try a different email address
          </button>
        </p>
      </div>
    </div>
  );
});
