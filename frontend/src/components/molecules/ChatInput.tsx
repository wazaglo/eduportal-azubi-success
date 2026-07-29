import { component$, useSignal, $, type QRL } from "@builder.io/qwik";
import { SendIcon, WandIcon } from "lucide-qwik";

export interface ChatInputProps {
  onSend$: QRL<(message: string) => void>;
  disabled?: boolean;
  placeholder?: string;
  class?: string;
}

export const ChatInput = component$<ChatInputProps>(
  ({ onSend$, disabled, placeholder = "Ask me anything...", class: className }) => {
    const input = useSignal("");

    const handleSend = $(() => {
      const text = input.value.trim();
      if (!text || disabled) return;
      onSend$(text);
      input.value = "";
    });

    const handleKeyDown = $((e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    return (
      <div class={[`flex items-end gap-2 p-4 border-t border-border bg-surface`, className].join(" ")}>
        <div class="flex-1 relative">
          <textarea
            value={input.value}
            onInput$={(e: any) => (input.value = e.target.value)}
            onKeyDown$={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            class={[
              "w-full rounded-xl border border-border bg-surface-secondary px-4 py-3 pr-12 text-sm",
              "placeholder:text-text-muted resize-none",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              "transition-all duration-200",
              disabled ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
            aria-label="Chat input"
          />
          <WandIcon class="absolute right-3 bottom-3.5 h-4 w-4 text-text-muted" />
        </div>
        <button
          onClick$={handleSend}
          disabled={disabled || !input.value.trim()}
          aria-label="Send message"
          class={[
            "flex-shrink-0 rounded-xl p-3 transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary-500",
            input.value.trim() && !disabled
              ? "bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-600/25"
              : "bg-surface-secondary text-text-muted cursor-not-allowed",
          ].join(" ")}
        >
          <SendIcon class="h-5 w-5" />
        </button>
      </div>
    );
  }
);
