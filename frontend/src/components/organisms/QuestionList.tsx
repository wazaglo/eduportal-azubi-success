import { component$ } from "@builder.io/qwik";
import { SearchIcon, MessageSquareIcon } from "lucide-qwik";
import { QuestionCard } from "../molecules/QuestionCard";
import { useQuestions } from "~/stores/question-store";

export interface QuestionListProps {
  class?: string;
}

export const QuestionList = component$<QuestionListProps>(({ class: className }) => {
  const questions = useQuestions();

  const filteredQuestions = () => {
    if (!questions.state.searchQuery) return questions.state.questions;
    const q = questions.state.searchQuery.toLowerCase();
    return questions.state.questions.filter((item) => item.question.toLowerCase().includes(q));
  };

  return (
    <div class={[`flex flex-col h-full border-r border-border bg-surface`, className].join(" ")}>
      <div class="p-4 border-b border-border space-y-3">
        <h2 class="text-sm font-semibold text-text-primary uppercase tracking-wider">
          My Questions
        </h2>
        <div class="relative">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="search"
            placeholder="Search questions..."
            value={questions.state.searchQuery}
            onInput$={(e: any) => questions.setSearchQuery(e.target.value)}
            class={[
              "w-full rounded-lg border border-border bg-surface-secondary pl-9 pr-3 py-2 text-sm",
              "placeholder:text-text-muted",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              "transition-all duration-200",
            ].join(" ")}
            aria-label="Search questions"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredQuestions().length === 0 ? (
          <div class="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageSquareIcon class="h-8 w-8 text-text-muted mb-2" />
            <p class="text-sm text-text-muted">No questions yet</p>
            <p class="text-xs text-text-muted mt-1">Ask your first question below</p>
          </div>
        ) : (
          filteredQuestions().map((question) => (
            <QuestionCard
              key={question.questionId}
              question={question}
              isActive={questions.state.activeQuestion?.questionId === question.questionId}
              onClick$={() => questions.selectQuestion(question.questionId)}
              onDelete$={() => questions.deleteQuestion(question.questionId)}
            />
          ))
        )}
      </div>
    </div>
  );
});
