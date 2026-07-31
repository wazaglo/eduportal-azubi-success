import { api } from "~/utils/api-client";

export const KNOWLEDGE_BUCKET = "eduportal-azubi-success-knowledge-base";
export const KNOWLEDGE_REGION = "eu-west-1";

export const SHS_LEVELS = ["SHS1", "SHS2", "SHS3"] as const;

export const SHS_SUBJECTS = [
  "English Language",
  "Core Mathematics",
  "Integrated Science",
  "Social Studies",
  "ICT",
  "Computing",
  "Biology",
  "Chemistry",
  "Physics",
  "Elective Mathematics",
  "Financial Accounting",
  "Accounting",
  "Business Management",
  "Economics",
  "Geography",
  "History",
  "Government",
  "Literature in English",
  "French",
  "Ghanaian Language",
  "Visual Arts",
  "Music",
  "Food and Nutrition",
  "Clothing and Textiles",
  "Management in Living",
  "Agriculture Science",
  "Technical Drawing",
  "Physical Education",
] as const;

export interface KnowledgeDocument {
  documentId: string;
  s3Key: string;
  fileName: string;
  year: string;
  subject: string;
  strand: string;
  substrand: string;
  size: number;
  contentType: string;
  status: "indexed" | "indexing" | "failed";
  uploadedBy: string;
  uploadedAt: string;
  downloads: number;
}

export interface PresignResponse {
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
  uploadedBy: string;
}

export async function listDocuments(params?: {
  year?: string;
  subject?: string;
  strand?: string;
  substrand?: string;
  limit?: number;
}): Promise<KnowledgeDocument[]> {
  const res = await api.get<{ data: KnowledgeDocument[] }>("/knowledge-base/documents", {
    params: Object.fromEntries(
      Object.entries(params ?? {}).filter(([, v]) => v)
    ) as Record<string, string>,
  });
  return res.data;
}

export async function presignUpload(input: {
  fileName: string;
  contentType: string;
  year: string;
  subject: string;
  strand: string;
  substrand: string;
}): Promise<PresignResponse> {
  const res = await api.post<{ data: PresignResponse }>("/knowledge-base/presign-upload", input);
  return res.data;
}

export async function completeUpload(input: {
  s3Key: string;
  fileName: string;
  year: string;
  subject: string;
  strand: string;
  substrand: string;
  size: number;
  contentType: string;
}): Promise<KnowledgeDocument> {
  const res = await api.post<{ data: KnowledgeDocument }>("/knowledge-base/complete-upload", input);
  return res.data;
}

export async function deleteDocument(documentId: string, s3Key: string): Promise<void> {
  await api.delete<{ data: { deleted: boolean } }>("/knowledge-base/documents", {
    body: JSON.stringify({ documentId, s3Key }),
  });
}

export async function uploadToKnowledgeBase(file: File, meta: {
  year: string;
  subject: string;
  strand: string;
  substrand: string;
}): Promise<KnowledgeDocument> {
  const presigned = await presignUpload({
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    year: meta.year,
    subject: meta.subject,
    strand: meta.strand,
    substrand: meta.substrand,
  });

  const put = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!put.ok) {
    throw new Error(`S3 upload failed with status ${put.status}`);
  }

  return completeUpload({
    s3Key: presigned.s3Key,
    fileName: file.name,
    year: meta.year,
    subject: meta.subject,
    strand: meta.strand,
    substrand: meta.substrand,
    size: file.size,
    contentType: file.type || "application/octet-stream",
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toISOString().split("T")[0];
}
