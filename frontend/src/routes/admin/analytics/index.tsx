import { component$ } from "@builder.io/qwik";
import { TrendingUpIcon, UsersIcon, MessageSquareIcon, ClockIcon, ArrowUpIcon, ArrowDownIcon } from "lucide-qwik";
import { StatCard } from "~/components/molecules/StatCard";
import { Badge } from "~/components/atoms/Badge";

export default component$(() => {
  const weeklyData = [
    { day: "Mon", conversations: 240, users: 120 },
    { day: "Tue", conversations: 300, users: 145 },
    { day: "Wed", conversations: 280, users: 138 },
    { day: "Thu", conversations: 350, users: 160 },
    { day: "Fri", conversations: 310, users: 155 },
    { day: "Sat", conversations: 180, users: 90 },
    { day: "Sun", conversations: 150, users: 75 },
  ];

  const topTopics = [
    { topic: "Core Mathematics", count: 342, trend: "+12%" },
    { topic: "Integrated Science", count: 284, trend: "+8%" },
    { topic: "English Language", count: 256, trend: "+15%" },
    { topic: "Social Studies", count: 198, trend: "+5%" },
  ];

  const maxValue = Math.max(...weeklyData.map((d) => Math.max(d.conversations, d.users)));

  return (
    <div class="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">Analytics</h1>
        <p class="text-text-muted text-sm mt-1">Platform usage and performance metrics</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total UsersIcon" value="2,847" icon={UsersIcon} trend="+124" trendUp color="primary" />
        <StatCard title="Conversations" value="12,439" icon={MessageSquareIcon} trend="+892" trendUp color="success" />
        <StatCard title="Avg. Session" value="12m 34s" icon={ClockIcon} trend="+5%" trendUp color="info" />
        <StatCard title="Retention" value="87%" icon={TrendingUpIcon} trend="+3%" trendUp color="warning" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="rounded-2xl border border-border bg-surface p-6">
          <h2 class="text-lg font-semibold text-text-primary mb-4">Weekly Activity</h2>
          <div class="flex items-end gap-2 h-48">
            {weeklyData.map((d) => (
              <div key={d.day} class="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div class="w-full flex flex-col items-center gap-0.5">
                  <div
                    class="w-full rounded-t bg-primary-500/80 transition-all hover:bg-primary-500"
                    style={{ height: `${(d.conversations / maxValue) * 100}%` }}
                  />
                  <div
                    class="w-full rounded-t bg-green-500/80 transition-all hover:bg-green-500"
                    style={{ height: `${(d.users / maxValue) * 100}%` }}
                  />
                </div>
                <span class="text-xs text-text-muted mt-1">{d.day}</span>
              </div>
            ))}
          </div>
          <div class="flex items-center gap-4 mt-4 text-xs text-text-muted">
            <div class="flex items-center gap-1">
              <div class="h-2 w-2 rounded bg-primary-500" />
              Conversations
            </div>
            <div class="flex items-center gap-1">
              <div class="h-2 w-2 rounded bg-green-500" />
              UsersIcon
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-6">
          <h2 class="text-lg font-semibold text-text-primary mb-4">Top Topics</h2>
          <div class="space-y-3">
            {topTopics.map((topic) => {
              const maxTopicCount = topTopics[0].count;
              const width = (topic.count / maxTopicCount) * 100;
              const isUp = topic.trend.startsWith("+");

              return (
                <div key={topic.topic} class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-text-primary">{topic.topic}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-text-secondary">{topic.count}</span>
                      <span
                        class={[
                          "flex items-center gap-0.5 text-xs font-medium",
                          isUp ? "text-green-600" : "text-red-600",
                        ].join(" ")}
                      >
                        {isUp ? <ArrowUpIcon class="h-3 w-3" /> : <ArrowDownIcon class="h-3 w-3" />}
                        {topic.trend}
                      </span>
                    </div>
                  </div>
                  <div class="h-2 rounded-full bg-surface-tertiary overflow-hidden">
                    <div
                      class="h-full rounded-full bg-primary-500 transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-border bg-surface p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">Key Metrics</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: "Response Time", value: "1.2s", change: "-200ms", improvement: true },
            { label: "Accuracy Rate", value: "94.7%", change: "+2.1%", improvement: true },
            { label: "User Satisfaction", value: "4.8/5.0", change: "+0.3", improvement: true },
          ].map((metric) => (
            <div key={metric.label} class="p-4 rounded-xl bg-surface-secondary text-center">
              <p class="text-sm text-text-muted mb-1">{metric.label}</p>
              <p class="text-2xl font-bold text-text-primary mb-1">{metric.value}</p>
              <span
                class={[
                  "text-xs font-medium",
                  metric.improvement ? "text-green-600" : "text-red-600",
                ].join(" ")}
              >
                {metric.change} vs last week
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
