import { component$, useSignal } from "@builder.io/qwik";
import { SearchIcon, ThumbsUpIcon, ThumbsDownIcon, MessageSquareIcon, StarIcon, ClockIcon } from "lucide-qwik";
import { Badge } from "~/components/atoms/Badge";
import { Avatar } from "~/components/atoms/Avatar";

interface Feedback {
  id: string;
  user: { name: string; email: string };
  rating: number;
  comment: string;
  category: "general" | "bug" | "feature" | "improvement";
  status: "reviewed" | "pending" | "resolved";
  date: string;
}

const feedbacks: Feedback[] = [
  {
    id: "1",
    user: { name: "Sarah Johnson", email: "sarah@example.com" },
    rating: 5,
    comment: "The AI tutor is incredibly helpful! It explained complex calculus concepts in a way that finally made sense to me.",
    category: "general",
    status: "reviewed",
    date: "2024-07-15",
  },
  {
    id: "2",
    user: { name: "Michael Chen", email: "michael@example.com" },
    rating: 4,
    comment: "Great tool overall. Would love to see more advanced physics problem-solving capabilities added.",
    category: "feature",
    status: "pending",
    date: "2024-07-14",
  },
  {
    id: "3",
    user: { name: "Emily Rodriguez", email: "emily@example.com" },
    rating: 3,
    comment: "Sometimes the AI takes too long to respond. Looking forward to performance improvements.",
    category: "improvement",
    status: "pending",
    date: "2024-07-13",
  },
  {
    id: "4",
    user: { name: "James Wilson", email: "james@example.com" },
    rating: 5,
    comment: "This platform has significantly improved my grades. The step-by-step explanations are fantastic!",
    category: "general",
    status: "resolved",
    date: "2024-07-12",
  },
  {
    id: "5",
    user: { name: "Lisa Thompson", email: "lisa@example.com" },
    rating: 2,
    comment: "I encountered an error when trying to upload my chemistry assignment. The file upload feature seems broken.",
    category: "bug",
    status: "resolved",
    date: "2024-07-11",
  },
  {
    id: "6",
    user: { name: "Anna Martinez", email: "anna@example.com" },
    rating: 4,
    comment: "Would be great to have more interactive coding examples. Otherwise, the platform is excellent!",
    category: "feature",
    status: "pending",
    date: "2024-07-10",
  },
];

export default component$(() => {
  const searchQuery = useSignal("");
  const categoryFilter = useSignal<"all" | Feedback["category"]>("all");
  const statusFilter = useSignal<"all" | Feedback["status"]>("all");

  const filteredFeedbacks = () => {
    return feedbacks.filter((f) => {
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        if (
          !f.user.name.toLowerCase().includes(q) &&
          !f.comment.toLowerCase().includes(q)
        )
          return false;
      }
      if (categoryFilter.value !== "all" && f.category !== categoryFilter.value)
        return false;
      if (statusFilter.value !== "all" && f.status !== statusFilter.value)
        return false;
      return true;
    });
  };

  const getCategoryVariant = (category: Feedback["category"]) => {
    switch (category) {
      case "bug": return "danger";
      case "feature": return "info";
      case "improvement": return "warning";
      default: return "default";
    }
  };

  const getStatusVariant = (status: Feedback["status"]) => {
    switch (status) {
      case "resolved": return "success";
      case "reviewed": return "info";
      default: return "warning";
    }
  };

  const avgRating =
    feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length;

  return (
    <div class="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">Feedback</h1>
        <p class="text-text-muted text-sm mt-1">Review and manage user feedback</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Feedback", value: feedbacks.length, icon: MessageSquareIcon, color: "primary" },
          { label: "Average Rating", value: avgRating.toFixed(1), icon: StarIcon, color: "warning" },
          { label: "Positive", value: feedbacks.filter((f) => f.rating >= 4).length, icon: ThumbsUpIcon, color: "success" },
          { label: "Negative", value: feedbacks.filter((f) => f.rating <= 2).length, icon: ThumbsDownIcon, color: "danger" },
        ].map((stat) => (
          <div key={stat.label} class="rounded-xl border border-border bg-surface p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-text-muted">{stat.label}</span>
              <stat.icon class={["h-4 w-4", `text-${stat.color === "primary" ? "primary" : stat.color}-600`].join(" ")} />
            </div>
            <p class="text-2xl font-bold text-text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="search"
            placeholder="Search feedback..."
            value={searchQuery.value}
            onInput$={(e: any) => (searchQuery.value = e.target.value)}
            class={[
              "w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-2.5 text-sm",
              "placeholder:text-text-muted",
              "focus:outline-none focus:ring-2 focus:ring-primary-500",
            ].join(" ")}
          />
        </div>
        <div class="flex gap-2">
          <select
            value={categoryFilter.value}
            onChange$={(e: any) => (categoryFilter.value = e.target.value)}
            class="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="improvement">Improvement</option>
          </select>
          <select
            value={statusFilter.value}
            onChange$={(e: any) => (statusFilter.value = e.target.value)}
            class="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div class="space-y-3">
        {filteredFeedbacks().map((feedback) => (
          <div
            key={feedback.id}
            class="rounded-xl border border-border bg-surface p-5 hover:shadow-md transition-all"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <Avatar name={feedback.user.name} size="sm" />
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-semibold text-text-primary">{feedback.user.name}</span>
                    <span class="text-xs text-text-muted">{feedback.user.email}</span>
                  </div>
                  <div class="flex items-center gap-2 mb-2">
                    <div class="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon
                          key={i}
                          class={[
                            "h-3.5 w-3.5",
                            i < feedback.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-text-muted",
                          ].join(" ")}
                        />
                      ))}
                    </div>
                    <span class="text-xs text-text-muted flex items-center gap-1">
                      <ClockIcon class="h-3 w-3" />
                      {feedback.date}
                    </span>
                  </div>
                  <p class="text-sm text-text-secondary leading-relaxed">{feedback.comment}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <Badge variant={getCategoryVariant(feedback.category)}>
                  {feedback.category}
                </Badge>
                <Badge variant={getStatusVariant(feedback.status)}>
                  {feedback.status}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
