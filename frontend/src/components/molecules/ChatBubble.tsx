import { component$ } from "@builder.io/qwik";
import { BotIcon, UserIcon, DatabaseIcon, ExternalLinkIcon } from "lucide-qwik";
import type { KnowledgeSource } from "~/stores/chat-store";

export interface ChatBubbleProps {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  sources?: KnowledgeSource[];
  class?: string;
}

export const ChatBubble = component$<ChatBubbleProps>(({ content, role, timestamp, sources, class: className }) => {
  const isUser = role === "user";
  const time = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      class={[
        "flex gap-3 w-full",
        isUser ? "flex-row-reverse" : "flex-row",
        className,
      ].join(" ")}
    >
      <div
        class={[
          "flex-shrink-0 flex items-start pt-1",
          isUser ? "ml-2" : "mr-2",
        ].join(" ")}
      >
        <div
          class={[
            "rounded-full p-2",
            isUser
              ? "bg-primary-100 dark:bg-primary-900"
              : "bg-surface-tertiary",
          ].join(" ")}
        >
          {isUser ? (
            <UserIcon class="h-4 w-4 text-primary-600 dark:text-primary-400" />
          ) : (
            <BotIcon class="h-4 w-4 text-text-secondary" />
          )}
        </div>
      </div>
      <div
        class={[
          "flex flex-col max-w-[75%]",
          isUser ? "items-end" : "items-start",
        ].join(" ")}
      >
        <div
          class={[
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
            isUser
              ? "bg-primary-600 text-white rounded-tr-sm"
              : "bg-surface-secondary text-text-primary border border-border rounded-tl-sm",
          ].join(" ")}
        >
          {content}
        </div>
        {sources && sources.length > 0 && (
          <div class="mt-2 px-1 w-full">
            <div class="flex items-center gap-1.5 mb-1.5">
              <DatabaseIcon class="h-3 w-3 text-text-muted" />
              <span class="text-xs font-medium text-text-muted">Sources from Knowledge Base</span>
            </div>
            <div class="space-y-1">
              {sources.map((source, i) => (
                <div key={i} class="flex items-start gap-1.5 text-xs text-primary-600 dark:text-primary-400">
                  <ExternalLinkIcon class="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <span class="font-medium">{source.title}</span>
                    {source.snippet && (
                      <span class="text-text-muted"> — {source.snippet}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <span class="text-xs text-text-muted mt-1 px-1">{time}</span>
      </div>
    </div>
  );
});
