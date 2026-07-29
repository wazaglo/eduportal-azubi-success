import { component$ } from "@builder.io/qwik";
import { Loader2Icon } from "lucide-qwik";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  class?: string;
}

export const Spinner = component$<SpinnerProps>(({ size = "md", class: className }) => {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-10 w-10",
  };

  return (
    <Loader2Icon
      class={[
        "animate-spin text-primary-600",
        sizes[size] || sizes.md,
        className,
      ].join(" ")}
      aria-label="Loading"
    />
  );
});
