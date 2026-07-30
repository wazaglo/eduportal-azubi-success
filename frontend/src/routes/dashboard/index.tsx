import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import {
  MessageSquareIcon,
  BookOpenIcon,
  DatabaseIcon,
  TrendingUpIcon,
  ClockIcon,
  ArrowRightIcon,
  WandIcon,
  GraduationCapIcon,
  LightbulbIcon,
  ZapIcon,
} from "lucide-qwik";
import { StatCard } from "~/components/molecules/StatCard";
import { Button } from "~/components/atoms/Button";
import { useChat } from "~/stores/chat-store";

export default component$(() => {
  const chat = useChat();
  const recentConversations = chat.state.conversations.slice(0, 3);

  const quickActions = [
    {
      icon: MessageSquareIcon,
      label: "Start New Chat",
      description: "Ask AI for homework help",
      href: "/dashboard/chat",
      color: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    },
    {
      icon: BookOpenIcon,
      label: "View History",
      description: "Browse past conversations",
      href: "/dashboard/history",
      color: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400",
    },
    {
      icon: DatabaseIcon,
      label: "Knowledge Base",
      description: "Browse learning materials",
      href: "/dashboard/knowledge-base",
      color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
  ];

  return (
    <div class="space-y-6 max-w-7xl mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p class="text-text-muted text-sm mt-1">Welcome back! Here's your activity overview.</p>
        </div>
        <Link href="/dashboard/chat">
          <Button variant="primary">
            <WandIcon class="h-4 w-4" />
            New Chat
          </Button>
        </Link>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Conversations"
          value={chat.state.conversations.length}
          icon={MessageSquareIcon}
          trend="+12%"
          trendUp
          color="primary"
        />
        <StatCard
          title="Study Hours"
          value="24"
          icon={ClockIcon}
          trend="+8%"
          trendUp
          color="success"
        />
        <StatCard
          title="Questions Asked"
          value={chat.state.conversations.reduce((acc, c) => acc + c.messages.length, 0)}
          icon={LightbulbIcon}
          trend="+23%"
          trendUp
          color="warning"
        />
        <StatCard
          title="KB Articles"
          value="7"
          icon={DatabaseIcon}
          trend="+2"
          trendUp
          color="info"
        />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <div class="rounded-2xl border border-border bg-surface p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-text-primary">Recent Conversations</h2>
              <Link
                href="/dashboard/history"
                class="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                View all
                <ArrowRightIcon class="h-4 w-4" />
              </Link>
            </div>
            <div class="space-y-3">
              {recentConversations.length === 0 ? (
                <div class="text-center py-8">
                  <MessageSquareIcon class="h-8 w-8 text-text-muted mx-auto mb-2" />
                  <p class="text-sm text-text-muted">No conversations yet</p>
                  <Link href="/dashboard/chat">
                    <Button variant="primary" size="sm" class="mt-3">
                      Start your first chat
                    </Button>
                  </Link>
                </div>
              ) : (
                recentConversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/dashboard/chat/${conv.id}`}
                    class="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-secondary transition-colors group"
                  >
                    <div class="rounded-lg bg-surface-tertiary p-2 group-hover:bg-primary-50 dark:group-hover:bg-primary-950/40 transition-colors">
                      <MessageSquareIcon class="h-4 w-4 text-text-muted group-hover:text-primary-600 transition-colors" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-text-primary truncate">{conv.title}</p>
                      <p class="text-xs text-text-muted truncate">{conv.lastMessage}</p>
                    </div>
                    <span class="text-xs text-text-muted">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <div class="rounded-2xl border border-border bg-surface p-6">
            <h2 class="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
            <div class="space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  class="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-secondary transition-colors group"
                >
                  <div class={[`rounded-lg p-2`, action.color].join(" ")}>
                    <action.icon class="h-5 w-5" />
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-text-primary">{action.label}</p>
                    <p class="text-xs text-text-muted">{action.description}</p>
                  </div>
                  <ArrowRightIcon class="h-4 w-4 text-text-muted group-hover:text-primary-600 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          <div class="rounded-2xl border border-border bg-surface p-6 mt-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="rounded-lg bg-primary-50 dark:bg-primary-950/40 p-2">
                <TrendingUpIcon class="h-5 w-5 text-primary-600" />
              </div>
              <h2 class="text-lg font-semibold text-text-primary">Weekly Streak</h2>
            </div>
            <div class="text-center py-4">
              <div class="text-3xl font-bold text-primary-600 mb-1">5</div>
              <p class="text-sm text-text-muted">days in a row</p>
              <div class="flex justify-center gap-2 mt-4">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                  <div key={day} class="flex flex-col items-center gap-1">
                    <div
                      class={[
                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium",
                        i < 5
                          ? "bg-primary-600 text-white"
                          : "bg-surface-tertiary text-text-muted",
                      ].join(" ")}
                    >
                      <ZapIcon class={i < 5 ? "h-3 w-3" : "h-3 w-3"} />
                    </div>
                    <span class="text-[10px] text-text-muted">{day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
