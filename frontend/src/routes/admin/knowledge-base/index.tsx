import { component$ } from "@builder.io/qwik";
import {
  DatabaseIcon,
  UploadIcon,
  FileTextIcon,
  Trash2Icon,
  BookOpenIcon,
  ExternalLinkIcon,
  SearchIcon,
  ClockIcon,
  UsersIcon,
} from "lucide-qwik";
import { StatCard } from "~/components/molecules/StatCard";
import { Badge } from "~/components/atoms/Badge";
import { Button } from "~/components/atoms/Button";

export default component$(() => {
  const documents = [
    { name: "Calculus_Full_Guide.pdf", subject: "Mathematics", size: "12.4 MB", status: "indexed", uploaded: "2026-07-28", downloads: 342 },
    { name: "Physics_Newton_Laws.docx", subject: "Physics", size: "3.2 MB", status: "indexed", uploaded: "2026-07-27", downloads: 284 },
    { name: "Data_Structures_Reference.pdf", subject: "Computer Science", size: "8.7 MB", status: "indexed", uploaded: "2026-07-26", downloads: 256 },
    { name: "DNA_Replication_Notes.pdf", subject: "Biology", size: "2.1 MB", status: "indexed", uploaded: "2026-07-25", downloads: 198 },
    { name: "Organic_Chemistry_Guide.pdf", subject: "Chemistry", size: "5.6 MB", status: "indexing", uploaded: "2026-07-24", downloads: 145 },
    { name: "Essay_Writing_Style.pdf", subject: "Literature", size: "1.8 MB", status: "indexed", uploaded: "2026-07-23", downloads: 167 },
  ];

  return (
    <div class="space-y-6 max-w-7xl mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-text-primary">Knowledge Base Management</h1>
          <p class="text-text-muted text-sm mt-1">
            Manage documents stored in S3. Upload, index, and organize learning materials for AI retrieval.
          </p>
        </div>
        <Button variant="primary">
          <UploadIcon class="h-4 w-4" />
          Upload to S3
        </Button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Documents" value="156" icon={FileTextIcon} trend="+12" trendUp color="primary" />
        <StatCard title="Indexed" value="144" icon={DatabaseIcon} trend="+8" trendUp color="success" />
        <StatCard title="S3 Storage Used" value="2.4 GB" icon={DatabaseIcon} trend="+320 MB" trendUp color="info" />
        <StatCard title="Total Downloads" value="1,847" icon={UsersIcon} trend="+12%" trendUp color="warning" />
      </div>

      <div class="rounded-2xl border border-border bg-surface">
        <div class="p-4 border-b border-border">
          <div class="relative">
            <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search documents..."
              class="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-surface-secondary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                <th class="text-left p-4 font-medium">Document</th>
                <th class="text-left p-4 font-medium">Subject</th>
                <th class="text-left p-4 font-medium">Size</th>
                <th class="text-left p-4 font-medium">Status</th>
                <th class="text-left p-4 font-medium">Uploaded</th>
                <th class="text-left p-4 font-medium">Downloads</th>
                <th class="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.name} class="border-b border-border last:border-0 hover:bg-surface-secondary transition-colors">
                  <td class="p-4">
                    <div class="flex items-center gap-3">
                      <div class="rounded-lg bg-primary-50 dark:bg-primary-950/40 p-2">
                        <FileTextIcon class="h-4 w-4 text-primary-600" />
                      </div>
                      <span class="font-medium text-text-primary">{doc.name}</span>
                    </div>
                  </td>
                  <td class="p-4 text-text-secondary">{doc.subject}</td>
                  <td class="p-4 text-text-secondary">{doc.size}</td>
                  <td class="p-4">
                    <Badge variant={doc.status === "indexed" ? "success" : "warning"}>
                      {doc.status === "indexed" ? "Indexed" : "Indexing..."}
                    </Badge>
                  </td>
                  <td class="p-4 text-text-secondary">{doc.uploaded}</td>
                  <td class="p-4 text-text-secondary">{doc.downloads}</td>
                  <td class="p-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button class="p-2 rounded-lg hover:bg-surface-tertiary text-text-muted hover:text-text-primary transition-colors" title="View">
                        <ExternalLinkIcon class="h-4 w-4" />
                      </button>
                      <button class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                        <Trash2Icon class="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-2xl border border-border bg-surface p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">S3 Bucket Overview</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-xl bg-surface-secondary">
            <p class="text-xs text-text-muted mb-1">Bucket</p>
            <p class="text-sm font-medium text-text-primary">azubi-success-knowledge-base</p>
          </div>
          <div class="p-4 rounded-xl bg-surface-secondary">
            <p class="text-xs text-text-muted mb-1">Region</p>
            <p class="text-sm font-medium text-text-primary">us-east-1</p>
          </div>
          <div class="p-4 rounded-xl bg-surface-secondary">
            <p class="text-xs text-text-muted mb-1">Encryption</p>
            <p class="text-sm font-medium text-text-primary">AES-256 (SSE-S3)</p>
          </div>
        </div>
      </div>
    </div>
  );
});
