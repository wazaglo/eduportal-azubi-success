export type QuestionSource = 'knowledge_base' | 'ai' | 'pending';
export type QuestionStatus = 'answered' | 'pending';

export interface Question {
  questionId: string;
  userId: string;
  question: string;
  normalizedQuestion: string;
  response: string | null;
  subject: string | null;
  source: QuestionSource;
  status: QuestionStatus;
  documentTitle?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionInput {
  questionId?: string;
  userId: string;
  question: string;
  normalizedQuestion?: string;
  response: string | null;
  subject: string | null;
  source: QuestionSource;
  status?: QuestionStatus;
  documentTitle?: string | null;
}

export interface FaqEntry {
  question: string;
  count: number;
  response: string | null;
  subject: string | null;
}
