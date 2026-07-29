import { component$ } from "@builder.io/qwik";
import { UserIcon } from "lucide-qwik";

export interface AvatarProps {
  src?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  class?: string;
}

export const Avatar = component$<AvatarProps>(({ src, name, size = "md", class: className }) => {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
    xl: "h-8 w-8",
  };

  function getInitials(n: string): string {
    return n
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  if (src) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        class={[
          "rounded-full object-cover border-2 border-border",
          sizes[size],
          className,
        ].join(" ")}
      />
    );
  }

  return (
    <div
      class={[
        "rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold border-2 border-border",
        sizes[size],
        className,
      ].join(" ")}
      aria-label={name || "UserIcon avatar"}
    >
      {name ? getInitials(name) : <UserIcon class={iconSizes[size]} />}
    </div>
  );
});
