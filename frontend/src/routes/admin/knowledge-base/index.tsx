import { component$, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import {
  DatabaseIcon,
  UploadIcon,
  FileTextIcon,
  Trash2Icon,
  BookOpenIcon,
  ExternalLinkIcon,
  SearchIcon,
  UsersIcon,
  DownloadIcon,
} from "lucide-qwik";
import { StatCard } from "~/components/molecules/StatCard";
import { Badge } from "~/components/atoms/Badge";
import { Button } from "~/components/atoms/Button";
import {
  KNOWLEDGE_BUCKET,
  KNOWLEDGE_REGION,
  SHS_LEVELS,
  SHS_SUBJECTS,
  deleteDocument,
  formatBytes,
  formatDate,
  listDocuments,
  uploadToKnowledgeBase,
  type KnowledgeDocument,
} from "~/utils/knowledge-base";

export default component$(() => {
  const documents = useSignal<KnowledgeDocument[]>([]);
  const searchQuery = useSignal("");
  const uploadNotice = useSignal("");
  const uploadError = useSignal("");
  const isUploading = useSignal(false);
  const fileInput = useSignal<HTMLInputElement | undefined>(undefined);
  const uploadMeta = useStore({
    year: "SHS1",
    subject: "ICT",
    strand: "",
    substrand: "",
  });

  useVisibleTask$(async () => {
    try {
      documents.value = await listDocuments();
    } catch {
      uploadError.value = "Failed to load documents. Please sign in again.";
    }
  });

  const filteredDocuments = () => {
    const q = searchQuery.value.toLowerCase();
    if (!q) return documents.value;
    return documents.value.filter(
      (d) =>
        d.fileName.toLowerCase().includes(q) ||
        d.subject.toLowerCase().includes(q) ||
        d.strand.toLowerCase().includes(q) ||
        d.year.toLowerCase().includes(q)
    );
  };

  const handleUpload = $(
    async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      uploadError.value = "";
      if (!uploadMeta.strand || !uploadMeta.substrand) {
        uploadError.value = "Strand and sub-strand are required before uploading.";
        fileInput.value && (fileInput.value.value = "");
        return;
      }
      isUploading.value = true;
      uploadNotice.value = `Uploading "${file.name}" to ${uploadMeta.year}/${uploadMeta.subject}...`;
      try {
        await uploadToKnowledgeBase(file, uploadMeta);
        uploadNotice.value = `Uploaded "${file.name}" successfully.`;
        documents.value = await listDocuments();
      } catch (err: any) {
        uploadError.value = err?.message || "Upload failed. Please try again.";
        uploadNotice.value = "";
      } finally {
        isUploading.value = false;
        fileInput.value && (fileInput.value.value = "");
      }
    }
  );

  const handleDelete = $(async (doc: KnowledgeDocument) => {
    uploadError.value = "";
    try {
      await deleteDocument(doc.documentId, doc.s3Key);
      documents.value = await listDocuments();
      uploadNotice.value = `Deleted "${doc.fileName}".`;
      setTimeout(() => (uploadNotice.value = ""), 4000);
    } catch (err: any) {
      uploadError.value = err?.message || "Delete failed.";
    }
  });

  const totalDownloads = () => documents.value.reduce((sum, d) => sum + d.downloads, 0);
  const indexed = () => documents.value.filter((d) => d.status === "indexed").length;

  return (
    <div class="space-y-6 max-w-7xl mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-text-primary">Knowledge Base Management</h1>
          <p class="text-text-muted text-sm mt-1">
            Manage Ghana SHS curriculum documents stored in S3. Upload, index, and organize learning materials for AI retrieval.
          </p>
        </div>
        <Button variant="primary" onClick$={() => fileInput.value?.click()} loading={isUploading.value}>
          <UploadIcon class="h-4 w-4" />
          Upload to S3
        </Button>
        <input
          type="file"
          ref={fileInput}
          accept=".pdf,.md,.txt,.doc,.docx"
          class="hidden"
          onChange$={handleUpload}
        />
      </div>

      <div class="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <p class="text-sm font-medium text-text-primary">Upload metadata</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label class="block text-xs text-text-muted mb-1">Year / Level</label>
            <select
              class="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={uploadMeta.year}
              onChange$={(_, el) => (uploadMeta.year = el.value)}
            >
              {SHS_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Subject</label>
            <select
              class="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={uploadMeta.subject}
              onChange$={(_, el) => (uploadMeta.subject = el.value)}
            >
              {SHS_SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Strand</label>
            <input
              type="text"
              placeholder="e.g. ICTs in the Society"
              value={uploadMeta.strand}
              onInput$={(e: any) => (uploadMeta.strand = e.target.value)}
              class="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Sub-Strand</label>
            <input
              type="text"
              placeholder="e.g. Productivity Tools"
              value={uploadMeta.substrand}
              onInput$={(e: any) => (uploadMeta.substrand = e.target.value)}
              class="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {uploadNotice.value && (
        <div class="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400" role="status">
          {uploadNotice.value}
        </div>
      )}
      {uploadError.value && (
        <div class="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400" role="alert">
          {uploadError.value}
        </div>
      )}

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Documents" value={String(documents.value.length)} icon={FileTextIcon} color="primary" />
        <StatCard title="Indexed" value={String(indexed())} icon={DatabaseIcon} color="success" />
        <StatCard title="S3 Storage Used" value={formatBytes(documents.value.reduce((sum, d) => sum + d.size, 0))} icon={DatabaseIcon} color="info" />
        <StatCard title="Total Downloads" value={String(totalDownloads())} icon={UsersIcon} color="warning" />
      </div>

      <div class="rounded-2xl border border-border bg-surface">
        <div class="p-4 border-b border-border">
          <div class="relative">
            <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery.value}
              onInput$={(e: any) => (searchQuery.value = e.target.value)}
              class="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-surface-secondary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                <th class="text-left p-4 font-medium">Document</th>
                <th class="text-left p-4 font-medium">Year</th>
                <th class="text-left p-4 font-medium">Subject</th>
                <th class="text-left p-4 font-medium">Strand / Sub-Strand</th>
                <th class="text-left p-4 font-medium">Size</th>
                <th class="text-left p-4 font-medium">Status</th>
                <th class="text-left p-4 font-medium">Uploaded</th>
                <th class="text-left p-4 font-medium">Downloads</th>
                <th class="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments().map((doc) => (
                <tr key={doc.documentId} class="border-b border-border last:border-0 hover:bg-surface-secondary transition-colors">
                  <td class="p-4">
                    <div class="flex items-center gap-3">
                      <div class="rounded-lg bg-primary-50 dark:bg-primary-950/40 p-2">
                        <FileTextIcon class="h-4 w-4 text-primary-600" />
                      </div>
                      <span class="font-medium text-text-primary">{doc.fileName}</span>
                    </div>
                  </td>
                  <td class="p-4">
                    <Badge variant="info">{doc.year}</Badge>
                  </td>
                  <td class="p-4 text-text-secondary">{doc.subject}</td>
                  <td class="p-4 text-text-secondary">
                    <span class="text-text-muted">{doc.strand}</span>
                    <span class="text-text-muted"> / </span>
                    <span>{doc.substrand}</span>
                  </td>
                  <td class="p-4 text-text-secondary">{formatBytes(doc.size)}</td>
                  <td class="p-4">
                    <Badge variant={doc.status === "indexed" ? "success" : "warning"}>
                      {doc.status === "indexed" ? "Indexed" : "Indexing..."}
                    </Badge>
                  </td>
                  <td class="p-4 text-text-secondary">{formatDate(doc.uploadedAt)}</td>
                  <td class="p-4 text-text-secondary">{doc.downloads}</td>
                  <td class="p-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <a
                        class="p-2 rounded-lg hover:bg-surface-tertiary text-text-muted hover:text-text-primary transition-colors"
                        title="View in S3"
                        href={`https://s3.console.aws.amazon.com/s3/buckets/${KNOWLEDGE_BUCKET}?region=${KNOWLEDGE_REGION}&prefix=${encodeURIComponent(doc.s3Key)}`}
                        target="_blank"
                        rel="noopener"
                      >
                        <ExternalLinkIcon class="h-4 w-4" />
                      </a>
                      <button
                        class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-text-muted hover:text-red-600 transition-colors"
                        title="Delete"
                        onClick$={() => handleDelete(doc)}
                      >
                        <Trash2Icon class="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredDocuments().length === 0 && (
            <div class="text-center py-12">
              <DatabaseIcon class="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p class="text-text-muted text-sm">No documents found.</p>
            </div>
          )}
        </div>
      </div>

      <div class="rounded-2xl border border-border bg-surface p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">S3 Bucket Overview</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-xl bg-surface-secondary">
            <p class="text-xs text-text-muted mb-1">Bucket</p>
            <p class="text-sm font-medium text-text-primary">{KNOWLEDGE_BUCKET}</p>
          </div>
          <div class="p-4 rounded-xl bg-surface-secondary">
            <p class="text-xs text-text-muted mb-1">Region</p>
            <p class="text-sm font-medium text-text-primary">{KNOWLEDGE_REGION}</p>
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
