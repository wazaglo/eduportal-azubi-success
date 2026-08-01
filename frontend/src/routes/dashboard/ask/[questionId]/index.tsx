import { component$, useVisibleTask$ } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";
import { AskContainer } from "~/components/organisms/AskContainer";
import { QuestionList } from "~/components/organisms/QuestionList";
import { useQuestions } from "~/stores/question-store";

export default component$(() => {
  const location = useLocation();
  const questions = useQuestions();
  const questionId = location.params.questionId;

  useVisibleTask$(async () => {
    if (questions.state.questions.length === 0) {
      await questions.loadQuestions();
    }
    if (questionId) {
      await questions.selectQuestion(questionId);
    }
  });

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
