import { component$ } from "@builder.io/qwik";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  trendUp?: boolean;
  color?: "primary" | "success" | "warning" | "danger";
  class?: string;
}

export const StatCard = component$<StatCardProps>(
  ({ title, value, icon: Icon, trend, trendUp, color = "primary", class: className }) => {
    const colors = {
      primary: "bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400",
      success: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400",
      warning:
        "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400",
      danger: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    };

    return (
      <div
        class={[
          "rounded-2xl border border-border bg-surface p-5 transition-all duration-200 hover:shadow-lg hover:shadow-border/50",
          className,
        ].join(" ")}
      >
        <div class="flex items-start justify-between">
          <div class="space-y-2">
            <p class="text-sm text-text-muted font-medium">{title}</p>
            <p class="text-2xl font-bold text-text-primary tracking-tight">{value}</p>
            {trend && (
              <div class="flex items-center gap-1">
                <span
                  class={[
                    "text-xs font-medium",
                    trendUp ? "text-green-600" : "text-red-600",
                  ].join(" ")}
                >
                  {trend}
                </span>
                <span class="text-xs text-text-muted">vs last month</span>
              </div>
            )}
          </div>
          <div class={[`rounded-xl p-3`, colors[color]].join(" ")}>
            {typeof Icon === "function" && <Icon class="h-6 w-6" />}
          </div>
        </div>
      </div>
    );
  }
);
