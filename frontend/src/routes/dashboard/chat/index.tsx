import { component$ } from "@builder.io/qwik";
import { ChatContainer } from "~/components/organisms/ChatContainer";
import { ConversationList } from "~/components/organisms/ConversationList";

export default component$(() => {
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
