import { component$, useVisibleTask$ } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";
import { ChatContainer } from "~/components/organisms/ChatContainer";
import { ConversationList } from "~/components/organisms/ConversationList";
import { useChat } from "~/stores/chat-store";

export default component$(() => {
  const location = useLocation();
  const chat = useChat();
  const conversationId = location.params.conversationId;

  useVisibleTask$(() => {
    if (conversationId) {
      chat.selectConversation(conversationId);
    }
  });

  return (
    <div class="flex h-[calc(100vh-8rem)] -m-4 md:-m-6 lg:-m-8 overflow-hidden">
      <div class="hidden md:flex w-80 flex-shrink-0">
        <ConversationList class="w-full" />
      </div>
      <div class="flex-1">
        <ChatContainer class="h-full" />
      </div>
    </div>
  );
});
