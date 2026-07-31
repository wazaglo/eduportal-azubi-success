import { component$, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import {
  DatabaseIcon,
  SearchIcon,
  FileTextIcon,
  ClockIcon,
  FilterIcon,
  ChevronDownIcon,
} from "lucide-qwik";
import { Badge } from "~/components/atoms/Badge";
import {
  SHS_LEVELS,
  SHS_SUBJECTS,
  formatBytes,
  formatDate,
  listDocuments,
  type KnowledgeDocument,
} from "~/utils/knowledge-base";

export default component$(() => {
  const searchQuery = useSignal("");
  const selectedYear = useSignal("All");
  const selectedSubject = useSignal("All");
  const documents = useSignal<KnowledgeDocument[]>([]);
  const loadError = useSignal("");
  const filterOpen = useStore({ year: false, subject: false });

  useVisibleTask$(async () => {
    try {
      documents.value = await listDocuments();
    } catch {
      loadError.value = "Failed to load the knowledge base. Please sign in again.";
    }
  });

  const filtered = () => {
    return documents.value.filter((d) => {
      const q = searchQuery.value.toLowerCase();
      const matchesSearch =
        q === "" ||
        d.fileName.toLowerCase().includes(q) ||
        d.subject.toLowerCase().includes(q) ||
        d.strand.toLowerCase().includes(q) ||
        d.substrand.toLowerCase().includes(q);
      const matchesYear = selectedYear.value === "All" || d.year === selectedYear.value;
      const matchesSubject = selectedSubject.value === "All" || d.subject === selectedSubject.value;
      return matchesSearch && matchesYear && matchesSubject;
    });
  };

  const totalDocs = () => documents.value.length;

  return (
    <div class="space-y-6 max-w-7xl mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-text-primary">Knowledge Base</h1>
          <p class="text-text-muted text-sm mt-1">
            Browse Ghana SHS curriculum materials stored in our knowledge base. AI responses can reference these documents.
          </p>
        </div>
        <Badge variant="info">{totalDocs()} documents</Badge>
      </div>

      {loadError.value && (
        <div class="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400" role="alert">
          {loadError.value}
        </div>
      )}

      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search knowledge base..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            value={searchQuery.value}
            onInput$={(e: any) => (searchQuery.value = e.target.value)}
          />
        </div>
        <div class="relative">
          <select
            class="appearance-none pl-10 pr-8 py-2.5 rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm cursor-pointer"
            value={selectedYear.value}
            onChange$={(_, el) => (selectedYear.value = el.value)}
          >
            <option value="All">All Years</option>
            {SHS_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <FilterIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <ChevronDownIcon class="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
        </div>
        <div class="relative">
          <select
            class="appearance-none pl-10 pr-8 py-2.5 rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm cursor-pointer"
            value={selectedSubject.value}
            onChange$={(_, el) => (selectedSubject.value = el.value)}
          >
            <option value="All">All Subjects</option>
            {SHS_SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <FilterIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <ChevronDownIcon class="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered().map((doc) => (
          <div
            key={doc.documentId}
            class="rounded-2xl border border-border bg-surface p-5 hover:shadow-lg hover:shadow-border/50 transition-all duration-300 hover:-translate-y-0.5"
          >
            <div class="flex items-start gap-3 mb-3">
              <div class="rounded-xl bg-primary-50 dark:bg-primary-950/40 p-2.5 flex-shrink-0">
                <FileTextIcon class="h-5 w-5 text-primary-600" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold text-text-primary leading-snug break-all">{doc.fileName}</h3>
                <div class="flex items-center gap-2 mt-1">
                  <Badge variant="info">{doc.year}</Badge>
                  <span class="text-xs text-text-muted">{doc.subject}</span>
                </div>
              </div>
            </div>
            <p class="text-sm text-text-secondary leading-relaxed mb-4 line-clamp-2">
              <span class="text-text-muted">{doc.strand}</span>
              <span class="text-text-muted"> / </span>
              {doc.substrand}
            </p>
            <div class="flex items-center justify-between text-xs text-text-muted">
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1">
                  <DatabaseIcon class="h-3 w-3" />
                  {formatBytes(doc.size)}
                </span>
                <span class="flex items-center gap-1">
                  <ClockIcon class="h-3 w-3" />
                  {formatDate(doc.uploadedAt)}
                </span>
              </div>
              <span class="text-primary-600 font-medium text-xs">{doc.downloads} downloads</span>
            </div>
          </div>
        ))}
      </div>

      {filtered().length === 0 && (
        <div class="text-center py-16">
          <DatabaseIcon class="h-12 w-12 text-text-muted mx-auto mb-3" />
          <p class="text-text-muted text-sm">
            {documents.value.length === 0
              ? "No curriculum materials uploaded yet. Check back soon."
              : "No documents found matching your search."}
          </p>
        </div>
      )}
    </div>
  );
});
