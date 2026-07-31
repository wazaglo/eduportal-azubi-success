import { component$ } from "@builder.io/qwik";
import { SearchIcon, PlusIcon, MessageSquareIcon } from "lucide-qwik";
import { ConversationCard } from "../molecules/ConversationCard";
import { useChat } from "~/stores/chat-store";
import { Input } from "../atoms/Input";

export interface ConversationListProps {
  class?: string;
}

export const ConversationList = component$<ConversationListProps>(({ class: className }) => {
  const chat = useChat();

  const filteredConversations = () => {
    if (!chat.state.searchQuery) return chat.state.conversations;
    const q = chat.state.searchQuery.toLowerCase();
    return chat.state.conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
    );
  };

  return (
    <div class={[`flex flex-col h-full border-r border-border bg-surface`, className].join(" ")}>
      <div class="p-4 border-b border-border space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-text-primary uppercase tracking-wider">
            Conversations
          </h2>
          <button
            onClick$={() => chat.createConversation()}
            class="p-1.5 rounded-lg hover:bg-surface-secondary text-text-secondary hover:text-primary-600 transition-colors"
            aria-label="New conversation"
          >
            <PlusIcon class="h-4 w-4" />
          </button>
        </div>
        <div class="relative">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="search"
            placeholder="Search conversations..."
            value={chat.state.searchQuery}
            onInput$={(e: any) => chat.setSearchQuery(e.target.value)}
            class={[
              "w-full rounded-lg border border-border bg-surface-secondary pl-9 pr-3 py-2 text-sm",
              "placeholder:text-text-muted",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              "transition-all duration-200",
            ].join(" ")}
            aria-label="SearchIcon conversations"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredConversations().length === 0 ? (
          <div class="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageSquareIcon class="h-8 w-8 text-text-muted mb-2" />
            <p class="text-sm text-text-muted">No conversations yet</p>
            <button
              onClick$={() => chat.createConversation()}
              class="text-sm text-primary-600 hover:text-primary-700 mt-2 font-medium"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          filteredConversations().map((conv) => (
            <ConversationCard
              key={conv.id}
              conversation={conv}
              isActive={chat.state.activeConversation?.id === conv.id}
              onClick$={() => chat.selectConversation(conv.id)}
              onDelete$={() => chat.deleteConversation(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
});
