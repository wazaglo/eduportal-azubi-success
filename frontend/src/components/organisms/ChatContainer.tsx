import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { BotIcon, WandIcon } from "lucide-qwik";
import { ChatBubble } from "../molecules/ChatBubble";
import { ChatInput } from "../molecules/ChatInput";
import { useChat } from "~/stores/chat-store";
import { Spinner } from "../atoms/Spinner";

export interface ChatContainerProps {
  class?: string;
}

export const ChatContainer = component$<ChatContainerProps>(({ class: className }) => {
  const chat = useChat();
  const containerRef = useSignal<HTMLDivElement>();

  useVisibleTask$(({ track }) => {
    track(() => chat.state.activeConversation?.messages.length);
    track(() => chat.state.isTyping);
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
  });

  return (
    <div class={[`flex flex-col h-full`, className].join(" ")}>
      {chat.state.activeConversation ? (
        <>
          <div class="flex-1 overflow-y-auto p-4 space-y-4" ref={containerRef}>
            {chat.state.activeConversation.messages.length === 0 ? (
              <div class="flex flex-col items-center justify-center h-full text-center p-8">
                <div class="rounded-2xl bg-primary-50 dark:bg-primary-950/40 p-4 mb-4">
                  <WandIcon class="h-8 w-8 text-primary-600" />
                </div>
                <h3 class="text-lg font-semibold text-text-primary mb-2">
                  Start a conversation
                </h3>
                <p class="text-sm text-text-muted max-w-md">
                  Ask me anything about your studies, homework help, or academic guidance. I'm here to support your learning journey!
                </p>
              </div>
            ) : (
              chat.state.activeConversation.messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  content={msg.content}
                  role={msg.role}
                  timestamp={msg.timestamp}
                  sources={msg.sources}
                />
              ))
            )}

            {chat.state.isTyping && (
              <div class="flex items-center gap-3">
                <div class="rounded-full bg-surface-tertiary p-2">
                  <BotIcon class="h-4 w-4 text-text-secondary" />
                </div>
                <div class="bg-surface-secondary rounded-2xl rounded-tl-sm px-4 py-3 border border-border">
                  <div class="flex gap-1">
                    <span class="h-2 w-2 bg-text-muted rounded-full animate-bounce" style="animation-delay: 0ms" />
                    <span class="h-2 w-2 bg-text-muted rounded-full animate-bounce" style="animation-delay: 150ms" />
                    <span class="h-2 w-2 bg-text-muted rounded-full animate-bounce" style="animation-delay: 300ms" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <ChatInput onSend$={(msg) => chat.sendMessage(msg)} disabled={chat.state.isTyping} />
        </>
      ) : (
        <div class="flex flex-col items-center justify-center h-full text-center p-8">
          <div class="rounded-2xl bg-primary-50 dark:bg-primary-950/40 p-6 mb-6">
            <BotIcon class="h-16 w-16 text-primary-600" />
          </div>
          <h2 class="text-2xl font-bold text-text-primary mb-3">
            AI Student Assistant
          </h2>
          <p class="text-text-muted max-w-md mb-8">
            Select a conversation or start a new one to get AI-powered help with your studies
          </p>
          <button
            onClick$={() => chat.createConversation()}
            class="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/25 font-medium"
          >
            <WandIcon class="h-5 w-5" />
            New Conversation
          </button>
        </div>
      )}
    </div>
  );
});
