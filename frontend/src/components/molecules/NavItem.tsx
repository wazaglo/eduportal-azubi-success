import { component$ } from "@builder.io/qwik";
import { Link, useLocation } from "@builder.io/qwik-city";

export interface NavItemProps {
  href: string;
  label: string;
  icon: any;
  class?: string;
}

export const NavItem = component$<NavItemProps>(({ href, label, icon: Icon, class: className }) => {
  const location = useLocation();
  const isActive = location.url.pathname === href || location.url.pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      class={[
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
        "hover:bg-surface-secondary",
        isActive
          ? "bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300"
          : "text-text-secondary hover:text-text-primary",
        className,
      ].join(" ")}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        class={[
          "h-5 w-5 flex-shrink-0 transition-colors",
          isActive ? "text-primary-600" : "text-text-muted",
        ].join(" ")}
      />
      <span class="truncate">{label}</span>
    </Link>
  );
});
