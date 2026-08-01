import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import {
  SearchIcon,
  MessageSquareIcon,
  Trash2Icon,
  ClockIcon,
  ArrowUpDownIcon,
  CalendarIcon,
  WandIcon,
  HelpCircleIcon,
} from "lucide-qwik";
import { Button } from "~/components/atoms/Button";
import { Badge } from "~/components/atoms/Badge";
import { useQuestions } from "~/stores/question-store";

export default component$(() => {
  const questions = useQuestions();
  const searchQuery = useSignal("");
  const sortOrder = useSignal<"newest" | "oldest">("newest");
  const activeTab = useSignal<"questions" | "faq">("questions");

  useVisibleTask$(async () => {
    if (questions.state.questions.length === 0) {
      await questions.loadQuestions();
    }
    if (questions.state.faq.length === 0) {
      await questions.loadFaq();
    }
  });

  const filteredQuestions = () => {
    let items = questions.state.questions;
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      items = items.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          (item.subject ?? "").toLowerCase().includes(q)
      );
    }
    return [...items].sort((a, b) => {
      const ta = Date.parse(a.createdAt);
      const tb = Date.parse(b.createdAt);
      if (sortOrder.value === "newest") return tb - ta;
      return ta - tb;
    });
  };

  return (
    <div class="space-y-6 max-w-5xl mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-text-primary">Question History</h1>
          <p class="text-text-muted text-sm mt-1">Browse your past questions and frequently asked questions</p>
        </div>
        <Link href="/dashboard/ask">
          <Button variant="primary">
            <WandIcon class="h-4 w-4" />
            Ask a Question
          </Button>
        </Link>
      </div>

      <div class="flex gap-2 border-b border-border">
        <button
          onClick$={() => (activeTab.value = "questions")}
          class={[
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
            activeTab.value === "questions"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-text-muted hover:text-text-secondary",
          ].join(" ")}
        >
          My Questions ({questions.state.total})
        </button>
        <button
          onClick$={() => (activeTab.value = "faq")}
          class={[
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
            activeTab.value === "faq"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-text-muted hover:text-text-secondary",
          ].join(" ")}
        >
          FAQ ({questions.state.faq.length})
        </button>
      </div>

      {activeTab.value === "faq" ? (
        <div class="space-y-2">
          {questions.state.faq.length === 0 ? (
            <div class="text-center py-16">
              <div class="inline-flex items-center justify-center rounded-2xl bg-surface-tertiary p-4 mb-4">
                <HelpCircleIcon class="h-8 w-8 text-text-muted" />
              </div>
              <h3 class="text-lg font-semibold text-text-primary mb-2">No FAQs yet</h3>
              <p class="text-sm text-text-muted">Frequently asked questions will appear here as students ask questions.</p>
            </div>
          ) : (
            questions.state.faq.map((entry) => (
              <div key={entry.question} class="rounded-xl border border-border bg-surface p-4 hover:shadow-md transition-all">
                <div class="flex items-center gap-2 mb-1">
                  <HelpCircleIcon class="h-4 w-4 text-primary-600 flex-shrink-0" />
                  <h3 class="text-sm font-semibold text-text-primary">{entry.question}</h3>
                  {entry.subject && <Badge variant="info">{entry.subject}</Badge>}
                  <Badge variant="success">{entry.count} ask{entry.count === 1 ? "" : "s"}</Badge>
                </div>
                {entry.response && (
                  <p class="text-sm text-text-muted mt-2 line-clamp-3">{entry.response}</p>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="relative flex-1">
              <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="search"
                placeholder="Search questions..."
                value={searchQuery.value}
                onInput$={(e: any) => (searchQuery.value = e.target.value)}
                class={[
                  "w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-2.5 text-sm",
                  "placeholder:text-text-muted",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                  "transition-all duration-200",
                ].join(" ")}
                aria-label="Search questions"
              />
            </div>
            <button
              onClick$={() => (sortOrder.value = sortOrder.value === "newest" ? "oldest" : "newest")}
              class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors"
            >
              <ArrowUpDownIcon class="h-4 w-4" />
              {sortOrder.value === "newest" ? "Newest" : "Oldest"}
            </button>
          </div>

          {filteredQuestions().length === 0 ? (
            <div class="text-center py-16">
              <div class="inline-flex items-center justify-center rounded-2xl bg-surface-tertiary p-4 mb-4">
                <MessageSquareIcon class="h-8 w-8 text-text-muted" />
              </div>
              <h3 class="text-lg font-semibold text-text-primary mb-2">No questions found</h3>
              <p class="text-sm text-text-muted mb-6">
                {searchQuery.value
                  ? "Try adjusting your search terms"
                  : "Ask your first question to get AI-powered study help"}
              </p>
              <Link href="/dashboard/ask">
                <Button variant="primary">
                  <WandIcon class="h-4 w-4" />
                  Ask a Question
                </Button>
              </Link>
            </div>
          ) : (
            <div class="space-y-2">
              {filteredQuestions().map((q) => {
                const date = new Date(Date.parse(q.createdAt));
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
                  <div key={q.questionId} class="rounded-xl border border-border bg-surface p-4 hover:shadow-md transition-all group">
                    <div class="flex items-start justify-between gap-4">
                      <Link href={`/dashboard/ask/${q.questionId}`} class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <h3 class="text-sm font-semibold text-text-primary truncate">{q.question}</h3>
                          {q.status === "pending" && <Badge variant="warning">Pending</Badge>}
                          {q.subject && <Badge variant="info">{q.subject}</Badge>}
                        </div>
                        <p class="text-sm text-text-muted line-clamp-2">{q.answer}</p>
                        <div class="flex items-center gap-3 mt-2 text-xs text-text-muted">
                          <span class="flex items-center gap-1">
                            <CalendarIcon class="h-3 w-3" />
                            {dateStr}
                          </span>
                          <span class="flex items-center gap-1">
                            <ClockIcon class="h-3 w-3" />
                            {timeStr}
                          </span>
                        </div>
                      </Link>
                      <button
                        onClick$={() => questions.deleteQuestion(q.questionId)}
                        class="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all text-text-muted hover:text-red-600"
                        aria-label={`Delete ${q.question}`}
                      >
                        <Trash2Icon class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
});
