import { component$, $, type QRL } from "@builder.io/qwik";
import { MessageSquareIcon, Trash2Icon, ClockIcon } from "lucide-qwik";
import type { Question } from "~/stores/question-store";

export interface QuestionCardProps {
  question: Question;
  isActive: boolean;
  onClick$: QRL<() => void>;
  onDelete$: QRL<() => void>;
  class?: string;
}

export const QuestionCard = component$<QuestionCardProps>(
  ({ question, isActive, onClick$, onDelete$, class: className }) => {
    const timeAgo = (timestamp: number): string => {
      const diff = Date.now() - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return new Date(timestamp).toLocaleDateString();
    };

    const ts = Date.parse(question.createdAt);

    return (
      <button
        onClick$={onClick$}
        class={[
          "w-full text-left p-3 rounded-xl transition-all duration-200 group",
          "hover:bg-surface-secondary",
          isActive
            ? "bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800"
            : "border border-transparent",
          className,
        ].join(" ")}
        aria-label={`Question: ${question.question}`}
        aria-current={isActive ? "page" : undefined}
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <MessageSquareIcon
              class={[
                "h-4 w-4 flex-shrink-0 mt-0.5",
                isActive
                  ? "text-primary-600"
                  : "text-text-muted",
              ].join(" ")}
            />
            <div class="min-w-0">
              <p
                class={[
                  "text-sm font-medium truncate",
                  isActive ? "text-primary-700 dark:text-primary-300" : "text-text-primary",
                ].join(" ")}
              >
                {question.question}
              </p>
              <p class="text-xs text-text-muted truncate mt-0.5">
                {question.subject ?? "General"} · {question.status}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            {question.status === "pending" && (
              <span class="h-2 w-2 rounded-full bg-amber-500" />
            )}
            <button
              onClick$={$(async () => onDelete$())}
              class="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
              aria-label="Delete question"
            >
              <Trash2Icon class="h-3.5 w-3.5 text-red-500" />
            </button>
          </div>
        </div>
        <div class="flex items-center gap-1 mt-1.5 ml-6">
          <ClockIcon class="h-3 w-3 text-text-muted" />
          <span class="text-xs text-text-muted">{timeAgo(ts)}</span>
        </div>
      </button>
    );
  }
);
