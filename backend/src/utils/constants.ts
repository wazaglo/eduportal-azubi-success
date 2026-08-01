export const TABLE_NAMES = {
  USERS: process.env.TABLE_USERS ?? 'ai-student-users',
  CACHE: process.env.TABLE_CACHE ?? 'ai-student-cache',
  FEEDBACK: process.env.TABLE_FEEDBACK ?? 'ai-student-feedback',
  ANALYTICS: process.env.TABLE_ANALYTICS ?? 'ai-student-analytics',
  KNOWLEDGE: process.env.TABLE_KNOWLEDGE ?? 'ai-student-knowledge',
  QUESTIONS: process.env.TABLE_QUESTIONS ?? 'ai-student-questions',
} as const;

export const COGNITO = {
  USER_POOL_ID: process.env.COGNITO_USER_POOL_ID ?? '',
  CLIENT_ID: process.env.COGNITO_CLIENT_ID ?? '',
} as const;

export const ROLES = {
  STUDENT: 'student',
  ADMIN: 'admin',
  SUPPORT: 'support',
} as const;

export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY: 429,
  INTERNAL: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  PROCESSING: 'processing',
  FAILED: 'failed',
} as const;

export const CONVERSATION_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  RESOLVED: 'resolved',
} as const;

export const QUERY_TYPES = {
  ACADEMIC: 'academic',
  ADMINISTRATIVE: 'administrative',
  GENERAL: 'general',
} as const;

export const AI_MODELS = {
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  O1_MINI: 'o1-mini',
} as const;

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const SIMILARITY_THRESHOLD = 0.85;
