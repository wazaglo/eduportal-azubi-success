import { component$, useSignal } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import {
  DatabaseIcon,
  SearchIcon,
  BookOpenIcon,
  FileTextIcon,
  GraduationCapIcon,
  ClockIcon,
  ArrowRightIcon,
  FilterIcon,
  ChevronDownIcon,
} from "lucide-qwik";
import { Button } from "~/components/atoms/Button";

interface KnowledgeArticle {
  id: string;
  title: string;
  subject: string;
  summary: string;
  type: "notes" | "reference" | "textbook" | "guide";
  lastUpdated: string;
  readTime: string;
  author: string;
}

export default component$(() => {
  const searchQuery = useSignal("");
  const selectedSubject = useSignal("All");

  const articles: KnowledgeArticle[] = [
    {
      id: "1",
      title: "Introduction to Calculus: Derivatives & Integrals",
      subject: "Mathematics",
      summary: "Comprehensive guide covering fundamental concepts of differential and integral calculus with worked examples.",
      type: "textbook",
      lastUpdated: "2026-07-28",
      readTime: "45 min",
      author: "Dr. Sarah Chen",
    },
    {
      id: "2",
      title: "Physics: Newton's Laws Explained",
      subject: "Physics",
      summary: "Detailed explanation of Newton's three laws of motion with real-world applications and practice problems.",
      type: "notes",
      lastUpdated: "2026-07-27",
      readTime: "30 min",
      author: "Prof. James Wilson",
    },
    {
      id: "3",
      title: "Programming Fundamentals: Data Structures",
      subject: "Computer Science",
      summary: "Essential data structures including arrays, linked lists, trees, and graphs with implementation examples.",
      type: "reference",
      lastUpdated: "2026-07-26",
      readTime: "60 min",
      author: "Tech Education Team",
    },
    {
      id: "4",
      title: "Molecular Biology: DNA Replication",
      subject: "Biology",
      summary: "Step-by-step breakdown of DNA replication process including enzymes involved and common exam questions.",
      type: "guide",
      lastUpdated: "2026-07-25",
      readTime: "25 min",
      author: "Dr. Emily Rodriguez",
    },
    {
      id: "5",
      title: "Organic Chemistry: Functional Groups",
      subject: "Chemistry",
      summary: "Complete reference guide to organic chemistry functional groups, their properties, and reactions.",
      type: "reference",
      lastUpdated: "2026-07-24",
      readTime: "35 min",
      author: "Prof. Michael Park",
    },
    {
      id: "6",
      title: "Essay Writing: Structure & Style",
      subject: "Literature",
      summary: "Learn how to structure academic essays, develop arguments, and cite sources in MLA and APA formats.",
      type: "guide",
      lastUpdated: "2026-07-23",
      readTime: "20 min",
      author: "Writing Center",
    },
  ];

  const subjects = ["All", ...new Set(articles.map((a) => a.subject))];

  const filtered = articles.filter((a) => {
    const matchesSearch = searchQuery.value === "" ||
      a.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      a.summary.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesSubject = selectedSubject.value === "All" || a.subject === selectedSubject.value;
    return matchesSearch && matchesSubject;
  });

  const typeIcon = (type: KnowledgeArticle["type"]) => {
    switch (type) {
      case "textbook": return BookOpenIcon;
      case "notes": return FileTextIcon;
      case "reference": return DatabaseIcon;
      case "guide": return GraduationCapIcon;
    }
  };

  return (
    <div class="space-y-6 max-w-7xl mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-text-primary">Knowledge Base</h1>
          <p class="text-text-muted text-sm mt-1">
            Browse learning materials stored in our knowledge base. AI responses can reference these documents.
          </p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search knowledge base..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            bind:value={searchQuery}
          />
        </div>
        <div class="relative">
          <select
            class="appearance-none pl-10 pr-8 py-2.5 rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm cursor-pointer"
            value={selectedSubject.value}
            onChange$={(_, el) => (selectedSubject.value = el.value)}
          >
            {subjects.map((s) => (
              <option key={s} value={s}>{s === "All" ? "All Subjects" : s}</option>
            ))}
          </select>
          <FilterIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <ChevronDownIcon class="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((article) => {
          const TypeIcon = typeIcon(article.type);
          return (
            <div
              key={article.id}
              class="rounded-2xl border border-border bg-surface p-5 hover:shadow-lg hover:shadow-border/50 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div class="flex items-start gap-3 mb-3">
                <div class="rounded-xl bg-primary-50 dark:bg-primary-950/40 p-2.5 flex-shrink-0">
                  <TypeIcon class="h-5 w-5 text-primary-600" />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-sm font-semibold text-text-primary leading-snug">{article.title}</h3>
                  <p class="text-xs text-text-muted mt-0.5">{article.subject}</p>
                </div>
              </div>
              <p class="text-sm text-text-secondary leading-relaxed mb-4 line-clamp-2">{article.summary}</p>
              <div class="flex items-center justify-between text-xs text-text-muted">
                <div class="flex items-center gap-3">
                  <span class="flex items-center gap-1">
                    <ClockIcon class="h-3 w-3" />
                    {article.readTime}
                  </span>
                  <span class="flex items-center gap-1">
                    <DatabaseIcon class="h-3 w-3" />
                    {article.type}
                  </span>
                </div>
                <span class="text-primary-600 font-medium text-xs">{article.author}</span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div class="text-center py-16">
          <DatabaseIcon class="h-12 w-12 text-text-muted mx-auto mb-3" />
          <p class="text-text-muted text-sm">No articles found matching your search.</p>
        </div>
      )}

      <div class="rounded-2xl border border-border bg-surface p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-text-primary">Upload Study Materials</h2>
            <p class="text-sm text-text-muted mt-1">
              Contribute to the knowledge base by uploading your notes and study guides.
              Materials are stored securely in S3 and indexed for AI retrieval.
            </p>
          </div>
          <Button variant="primary">
            <DatabaseIcon class="h-4 w-4" />
            Upload to S3
          </Button>
        </div>
      </div>
    </div>
  );
});
