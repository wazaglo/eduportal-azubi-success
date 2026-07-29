import { component$, useSignal } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import {
  SearchIcon,
  MessageSquareIcon,
  Trash2Icon,
  ClockIcon,
  FilterIcon,
  ArrowUpDownIcon,
  CalendarIcon,
  WandIcon,
} from "lucide-qwik";
import { Button } from "~/components/atoms/Button";
import { Badge } from "~/components/atoms/Badge";
import { useChat } from "~/stores/chat-store";

export default component$(() => {
  const chat = useChat();
  const searchQuery = useSignal("");
  const sortOrder = useSignal<"newest" | "oldest">("newest");

  const filteredConversations = () => {
    let convs = chat.state.conversations;
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      convs = convs.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q)
      );
    }
    return [...convs].sort((a, b) => {
      if (sortOrder.value === "newest") return b.updatedAt - a.updatedAt;
      return a.updatedAt - b.updatedAt;
    });
  };

  return (
    <div class="space-y-6 max-w-5xl mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-text-primary">Conversation History</h1>
          <p class="text-text-muted text-sm mt-1">Browse and manage your past conversations</p>
        </div>
        <Link href="/dashboard/chat">
          <Button variant="primary">
            <WandIcon class="h-4 w-4" />
            New Chat
          </Button>
        </Link>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="search"
            placeholder="SearchIcon conversations..."
            value={searchQuery.value}
            onInput$={(e: any) => (searchQuery.value = e.target.value)}
            class={[
              "w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-2.5 text-sm",
              "placeholder:text-text-muted",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              "transition-all duration-200",
            ].join(" ")}
            aria-label="SearchIcon conversations"
          />
        </div>
        <div class="flex gap-2">
          <button
            onClick$={() =>
              (sortOrder.value = sortOrder.value === "newest" ? "oldest" : "newest")
            }
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors"
          >
            <ArrowUpDownIcon class="h-4 w-4" />
            {sortOrder.value === "newest" ? "Newest" : "Oldest"}
          </button>
          <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors">
            <FilterIcon class="h-4 w-4" />
            FilterIcon
          </button>
        </div>
      </div>

      {filteredConversations().length === 0 ? (
        <div class="text-center py-16">
          <div class="inline-flex items-center justify-center rounded-2xl bg-surface-tertiary p-4 mb-4">
            <MessageSquareIcon class="h-8 w-8 text-text-muted" />
          </div>
          <h3 class="text-lg font-semibold text-text-primary mb-2">No conversations found</h3>
          <p class="text-sm text-text-muted mb-6">
            {searchQuery.value
              ? "Try adjusting your search terms"
              : "Start your first AI-powered study session"}
          </p>
          <Link href="/dashboard/chat">
            <Button variant="primary">
              <WandIcon class="h-4 w-4" />
              Start New Chat
            </Button>
          </Link>
        </div>
      ) : (
        <div class="space-y-2">
          {filteredConversations().map((conv) => {
            const date = new Date(conv.updatedAt);
            const dateStr = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const timeStr = date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={conv.id}
                class="rounded-xl border border-border bg-surface p-4 hover:shadow-md transition-all group"
              >
                <div class="flex items-start justify-between gap-4">
                  <Link
                    href={`/dashboard/chat/${conv.id}`}
                    class="flex-1 min-w-0"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <h3 class="text-sm font-semibold text-text-primary truncate">
                        {conv.title}
                      </h3>
                      {conv.unread && <Badge variant="info">New</Badge>}
                    </div>
                    <p class="text-sm text-text-muted line-clamp-2">
                      {conv.lastMessage || "No messages yet"}
                    </p>
                    <div class="flex items-center gap-3 mt-2 text-xs text-text-muted">
                      <span class="flex items-center gap-1">
                        <CalendarIcon class="h-3 w-3" />
                        {dateStr}
                      </span>
                      <span class="flex items-center gap-1">
                        <ClockIcon class="h-3 w-3" />
                        {timeStr}
                      </span>
                      <span>{conv.messages.length} messages</span>
                    </div>
                  </Link>
                  <button
                    onClick$={() => chat.deleteConversation(conv.id)}
                    class="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all text-text-muted hover:text-red-600"
                    aria-label={`Delete ${conv.title}`}
                  >
                    <Trash2Icon class="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
