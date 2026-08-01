import { component$, useSignal, $ } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";
import {
  LayoutDashboardIcon,
  MessageSquareIcon,
  HistoryIcon,
  UserIcon,
  SettingsIcon,
  LogOutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GraduationCapIcon,
  BookOpenIcon,
  DatabaseIcon,
} from "lucide-qwik";
import { NavItem } from "../molecules/NavItem";
import { useAuth } from "~/stores/auth-store";
import { Button } from "../atoms/Button";

export interface SidebarProps {
  class?: string;
}

export const Sidebar = component$<SidebarProps>(({ class: className }) => {
  const collapsed = useSignal(false);
  const location = useLocation();
  const auth = useAuth();
  const isAdmin = location.url.pathname.startsWith("/admin");

  const toggleCollapsed = $(() => {
    collapsed.value = !collapsed.value;
  });

  const studentNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
    { href: "/dashboard/ask", label: "Ask", icon: MessageSquareIcon },
    { href: "/dashboard/knowledge-base", label: "Knowledge Base", icon: DatabaseIcon },
    { href: "/dashboard/history", label: "History", icon: HistoryIcon },
    { href: "/dashboard/profile", label: "Profile", icon: UserIcon },
  ];

  const adminNavItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon },
    { href: "/admin/knowledge-base", label: "Knowledge Base", icon: DatabaseIcon },
    { href: "/admin/users", label: "Users", icon: BookOpenIcon },
    { href: "/admin/analytics", label: "Analytics", icon: HistoryIcon },
    { href: "/admin/feedback", label: "Feedback", icon: MessageSquareIcon },
    { href: "/admin/profile", label: "Profile", icon: UserIcon },
  ];

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  return (
    <aside
      class={[
        "fixed left-0 top-0 z-40 h-screen bg-surface border-r border-border flex flex-col transition-all duration-300 lg:relative lg:z-auto",
        collapsed.value ? "w-16" : "w-64",
        className,
      ].join(" ")}
    >
      <div class={["flex items-center gap-3 p-4 border-b border-border", collapsed.value ? "justify-center" : ""].join(" ")}>
        <div class="rounded-xl bg-primary-600 p-2 flex-shrink-0">
          <GraduationCapIcon class="h-5 w-5 text-white" />
        </div>
        {!collapsed.value && (
          <span class="font-bold text-lg text-text-primary whitespace-nowrap">
            Azubi Success
          </span>
        )}
      </div>

      <nav class="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Sidebar navigation">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </nav>

      <div class={["p-3 border-t border-border space-y-1", collapsed.value ? "flex flex-col items-center" : ""].join(" ")}>
        <NavItem href={isAdmin ? "/admin/settings" : "/dashboard/settings"} label="SettingsIcon" icon={SettingsIcon} />
        <button
          onClick$={() => auth.logout()}
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
          aria-label="Sign out"
        >
          <LogOutIcon class="h-5 w-5 flex-shrink-0" />
          {!collapsed.value && <span class="truncate">Sign Out</span>}
        </button>
      </div>

      <button
        onClick$={toggleCollapsed}
        class="absolute -right-3 top-20 rounded-full bg-surface border border-border p-1 text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-all shadow-sm"
        aria-label={collapsed.value ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed.value ? <ChevronRightIcon class="h-4 w-4" /> : <ChevronLeftIcon class="h-4 w-4" />}
      </button>
    </aside>
  );
});
