import { component$, type QRL } from "@builder.io/qwik";

export interface InputProps {
  name: string;
  label?: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
  placeholder?: string;
  value?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  autocomplete?: string;
  onInput$?: QRL<(value: string) => void>;
  onBlur$?: QRL<() => void>;
  class?: string;
  ariaLabel?: string;
}

export const Input = component$<InputProps>(
  ({
    name,
    label,
    type = "text",
    placeholder,
    value,
    error,
    required,
    disabled,
    readonly,
    autocomplete,
    onInput$,
    onBlur$,
    class: className,
    ariaLabel,
  }) => {
    const inputId = `input-${name}`;

    return (
      <div class={`flex flex-col gap-1.5 ${className || ""}`}>
        {label && (
          <label
            for={inputId}
            class="text-sm font-medium text-text-primary"
          >
            {label}
            {required && <span class="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <input
          id={inputId}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          required={required}
          disabled={disabled}
          readOnly={readonly}
          autocomplete={autocomplete as any}
          aria-label={ariaLabel || label}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          onInput$={(e: any) => onInput$?.(e.target.value)}
          onBlur$={onBlur$}
          class={[
            "w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200",
            "bg-surface text-text-primary placeholder:text-text-muted",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
            error
              ? "border-red-500 focus:ring-red-500 focus:border-red-500"
              : "border-border hover:border-primary-400",
            disabled ? "opacity-50 cursor-not-allowed bg-surface-secondary" : "",
          ].join(" ")}
        />
        {error && (
          <p id={`${inputId}-error`} class="text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
