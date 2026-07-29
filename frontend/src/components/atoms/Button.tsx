import { component$, type QRL } from "@builder.io/qwik";
import { Loader2Icon } from "lucide-qwik";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  onClick$?: QRL<() => void>;
  type?: "button" | "submit" | "reset";
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  class?: string;
  children?: any;
  ariaLabel?: string;
}

export const Button = component$<ButtonProps>(
  ({
    onClick$,
    type = "button",
    variant = "primary",
    size = "md",
    disabled,
    loading,
    fullWidth,
    class: className,
    children,
    ariaLabel,
  }) => {
    const base =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

    const variants: Record<ButtonVariant, string> = {
      primary:
        "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 active:bg-primary-800",
      secondary:
        "bg-surface-secondary text-text-primary hover:bg-surface-tertiary focus:ring-primary-500 border border-border",
      outline:
        "bg-transparent text-primary-600 border border-primary-600 hover:bg-primary-50 focus:ring-primary-500 dark:hover:bg-primary-950",
      ghost:
        "bg-transparent text-text-secondary hover:bg-surface-tertiary focus:ring-primary-500",
      danger:
        "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800",
    };

    const sizes: Record<ButtonSize, string> = {
      sm: "text-sm px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-6 py-3 gap-2.5",
    };

    return (
      <button
        type={type}
        onClick$={onClick$}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        aria-busy={loading}
        class={[
          base,
          variants[variant],
          sizes[size],
          fullWidth ? "w-full" : "",
          className,
        ].join(" ")}
      >
        {loading && <Loader2Icon class="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
