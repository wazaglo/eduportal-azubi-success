import { component$ } from "@builder.io/qwik";
import { AskContainer } from "~/components/organisms/AskContainer";
import { QuestionList } from "~/components/organisms/QuestionList";

export default component$(() => {
  return (
    <div class="flex h-[calc(100vh-8rem)] -m-4 md:-m-6 lg:-m-8 overflow-hidden">
      <div class="hidden md:flex w-80 flex-shrink-0">
        <QuestionList class="w-full" />
      </div>
      <div class="flex-1">
        <AskContainer class="h-full" />
      </div>
    </div>
  );
});
