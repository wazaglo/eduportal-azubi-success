import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { BotIcon, WandIcon } from "lucide-qwik";
import { QaBubble } from "../molecules/QaBubble";
import { QuestionInput } from "../molecules/QuestionInput";
import { useQuestions, parseTimestamp } from "~/stores/question-store";

export interface AskContainerProps {
  class?: string;
}

export const AskContainer = component$<AskContainerProps>(({ class: className }) => {
  const questions = useQuestions();
  const containerRef = useSignal<HTMLDivElement>();

  useVisibleTask$(({ track }) => {
    track(() => questions.state.activeQuestion?.questionId);
    track(() => questions.state.isAsking);
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
  });

  const active = questions.state.activeQuestion;
  const sources = active?.documentTitle
    ? [{ title: active.documentTitle, snippet: `Source: ${active.source}` }]
    : active?.modelUsed
      ? [{ title: `Answered by ${active.modelUsed}`, snippet: "AI model" }]
      : undefined;

  return (
    <div class={[`flex flex-col h-full`, className].join(" ")}>
      {active ? (
        <>
          <div class="flex-1 overflow-y-auto p-4 space-y-4" ref={containerRef}>
            <QaBubble
              key={active.questionId}
              content={active.question}
              role="user"
              timestamp={parseTimestamp(active.createdAt)}
            />
            {questions.state.isAsking ? (
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
            ) : (
              <QaBubble
                key={`${active.questionId}-answer`}
                content={active.answer}
                role="assistant"
                timestamp={parseTimestamp(active.updatedAt ?? active.createdAt)}
                sources={sources}
              />
            )}
          </div>

          <QuestionInput
            onSend$={(msg) => questions.ask(msg)}
            disabled={questions.state.isAsking || questions.state.limitReached}
          />
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
            Ask a question about Core Mathematics, English Language, Integrated Science
            or Social Studies. Answers are drawn from the NaCCA curriculum knowledge base.
          </p>
          <div class="w-full max-w-md">
            <QuestionInput onSend$={(msg) => questions.ask(msg)} disabled={questions.state.isAsking} placeholder="e.g. What is a quadratic equation?" />
          </div>
        </div>
      )}
    </div>
  );
});
