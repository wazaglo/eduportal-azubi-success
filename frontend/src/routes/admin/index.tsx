import { component$ } from "@builder.io/qwik";
import {
  UsersIcon,
  MessageSquareIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  ActivityIcon,
  ServerIcon,
  DatabaseIcon,
  ShieldIcon,
  BookOpenIcon,
} from "lucide-qwik";
import { StatCard } from "~/components/molecules/StatCard";
import { Badge } from "~/components/atoms/Badge";

export default component$(() => {
  const systemMetrics = [
    { label: "CPU Usage", value: "45%", color: "bg-green-500" },
    { label: "Memory", value: "62%", color: "bg-yellow-500" },
    { label: "Disk", value: "78%", color: "bg-primary-500" },
    { label: "API Latency", value: "120ms", color: "bg-green-500" },
  ];

  const recentUsers = [
    { name: "Sarah Johnson", email: "sarah@example.com", status: "active", role: "Student" },
    { name: "Michael Chen", email: "michael@example.com", status: "active", role: "Student" },
    { name: "Emily Rodriguez", email: "emily@example.com", status: "inactive", role: "Student" },
    { name: "David Kim", email: "david@example.com", status: "active", role: "Admin" },
    { name: "Lisa Thompson", email: "lisa@example.com", status: "suspended", role: "Student" },
  ];

  return (
    <div class="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
        <p class="text-text-muted text-sm mt-1">Monitor system health and user activity</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total UsersIcon" value="2,847" icon={UsersIcon} trend="+124" trendUp color="primary" />
        <StatCard title="Conversations" value="12,439" icon={MessageSquareIcon} trend="+892" trendUp color="success" />
        <StatCard title="Active Today" value="847" icon={ActivityIcon} trend="+12%" trendUp color="info" />
        <StatCard title="Reports" value="3" icon={AlertTriangleIcon} trend="-2" trendUp={false} color="danger" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <div class="rounded-2xl border border-border bg-surface p-6">
            <h2 class="text-lg font-semibold text-text-primary mb-4">System Health</h2>
            <div class="grid grid-cols-2 gap-4">
              {systemMetrics.map((metric) => (
                <div key={metric.label} class="p-4 rounded-xl bg-surface-secondary">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-text-muted">{metric.label}</span>
                    <span class="text-sm font-semibold text-text-primary">{metric.value}</span>
                  </div>
                  <div class="h-2 rounded-full bg-surface-tertiary overflow-hidden">
                    <div
                      class={[`h-full rounded-full transition-all`, metric.color].join(" ")}
                      style={{
                        width: metric.label === "API Latency" ? "30%" : metric.value,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div class="mt-6 space-y-3">
              <h3 class="text-sm font-semibold text-text-primary">Services Status</h3>
              {[
                { name: "AI Engine", status: "operational", icon: ServerIcon },
                { name: "Database", status: "operational", icon: DatabaseIcon },
                { name: "Authentication", status: "operational", icon: ShieldIcon },
                { name: "S3 Knowledge Base", status: "operational", icon: DatabaseIcon },
              ].map((service) => (
                <div
                  key={service.name}
                  class="flex items-center justify-between p-3 rounded-lg bg-surface-secondary"
                >
                  <div class="flex items-center gap-3">
                    <service.icon class="h-4 w-4 text-text-muted" />
                    <span class="text-sm font-medium text-text-primary">{service.name}</span>
                  </div>
                  <Badge
                    variant={service.status === "operational" ? "success" : "warning"}
                  >
                    {service.status === "operational" ? "Operational" : "Degraded"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div class="rounded-2xl border border-border bg-surface p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-text-primary">Recent UsersIcon</h2>
              <Badge variant="default">Today</Badge>
            </div>
            <div class="space-y-3">
              {recentUsers.map((user) => (
                <div key={user.email} class="flex items-center justify-between p-2 hover:bg-surface-secondary rounded-lg transition-colors">
                  <div>
                    <p class="text-sm font-medium text-text-primary">{user.name}</p>
                    <p class="text-xs text-text-muted">{user.email}</p>
                  </div>
                  <Badge
                    variant={
                      user.status === "active"
                        ? "success"
                        : user.status === "inactive"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {user.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
