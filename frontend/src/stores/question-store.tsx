import {
  component$,
  createContextId,
  useContextProvider,
  useContext,
  useStore,
  useVisibleTask$,
  Slot,
  $,
  type QRL,
} from "@builder.io/qwik";
import { api } from "~/utils/api-client";

export interface KnowledgeSource {
  title: string;
  snippet: string;
  url?: string;
}

export interface Question {
  questionId: string;
  question: string;
  answer: string;
  subject: string | null;
  source: "knowledge_base" | "ai" | "pending";
  status: "answered" | "pending" | "limit_reached";
  documentTitle?: string | null;
  modelUsed?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type QuestionStatus = Question["status"];

export interface FaqEntry {
  question: string;
  count: number;
  response: string | null;
  subject: string | null;
}

export interface QuestionState {
  questions: Question[];
  total: number;
  activeQuestion: Question | null;
  isAsking: boolean;
  isLoading: boolean;
  searchQuery: string;
  faq: FaqEntry[];
  limitReached: boolean;
}

export interface QuestionStore {
  state: QuestionState;
  ask: QRL<(content: string, subject?: string) => Promise<void>>;
  loadQuestions: QRL<() => Promise<void>>;
  loadFaq: QRL<() => Promise<void>>;
  selectQuestion: QRL<(id: string) => Promise<void>>;
  deleteQuestion: QRL<(id: string) => Promise<void>>;
  setSearchQuery: QRL<(query: string) => void>;
}

export const QuestionContext = createContextId<QuestionStore>("question-context");

export function useQuestions(): QuestionStore {
  return useContext(QuestionContext);
}

interface BackendQuestion {
  questionId: string;
  question: string;
  answer?: string;
  response?: string;
  subject: string | null;
  source: "knowledge_base" | "ai" | "pending";
  status: "answered" | "pending";
  documentTitle?: string | null;
  modelUsed?: string | null;
  createdAt: string;
  updatedAt?: string;
}

function parseTimestamp(value: string | undefined): number {
  if (!value) return Date.now();
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? Date.now() : ts;
}

function mapQuestion(q: BackendQuestion): Question {
  return {
    questionId: q.questionId,
    question: q.question,
    answer: q.answer ?? q.response ?? "",
    subject: q.subject ?? null,
    source: q.source,
    status: q.status,
    documentTitle: q.documentTitle ?? null,
    modelUsed: q.modelUsed ?? null,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}

export const QuestionProvider = component$(() => {
  const state = useStore<QuestionState>({
    questions: [],
    total: 0,
    activeQuestion: null,
    isAsking: false,
    isLoading: false,
    searchQuery: "",
    faq: [],
    limitReached: false,
  });

  const store: QuestionStore = {
    state,
    ask: $<(content: string, subject?: string) => Promise<void>>(async (content, subject) => {
      state.isAsking = true;
      try {
        const res = await api.post<{ data: BackendQuestion }>("/ask", {
          question: content,
          ...(subject ? { subject } : {}),
        });
         const question = mapQuestion(res.data);
         state.activeQuestion = question;
         state.questions = [question, ...state.questions.filter((q) => q.questionId !== question.questionId)];
         state.total += 1;
       } catch (e: any) {
         const details = e?.response?.data?.error?.details;
         if (details?.limitExceeded || e?.response?.status === 429) {
           state.limitReached = true;
           state.activeQuestion = {
             questionId: "",
             question: content,
             answer: `You've used today's allowance of AI answers. Please come back tomorrow to keep chatting with the study assistant.`,
             subject: null,
             source: "ai",
             status: "limit_reached" as QuestionStatus,
             modelUsed: null,
             createdAt: new Date().toISOString(),
           };
         } else {
           state.activeQuestion = {
             questionId: "",
             question: content,
             answer: "Sorry, I couldn't reach the assistant right now. Please try again.",
             subject: null,
             source: "pending",
             status: "pending",
             createdAt: new Date().toISOString(),
           };
         }
       }
    }),
    loadQuestions: $<() => Promise<void>>(async () => {
      state.isLoading = true;
      try {
        const res = await api.get<{ data: BackendQuestion[]; metadata?: { total?: number } }>("/question", {
          params: { limit: "100" },
        });
        state.questions = (res.data ?? []).map(mapQuestion);
        state.total = res.metadata?.total ?? state.questions.length;
      } catch {
        state.questions = [];
      } finally {
        state.isLoading = false;
      }
    }),
    loadFaq: $<() => Promise<void>>(async () => {
      try {
        const res = await api.get<{ data: FaqEntry[] }>("/FAQ", { params: { limit: "10" } });
        state.faq = res.data ?? [];
      } catch {
        state.faq = [];
      }
    }),
    selectQuestion: $<(id: string) => Promise<void>>(async (id) => {
      const found = state.questions.find((q) => q.questionId === id);
      if (found) state.activeQuestion = found;
    }),
    deleteQuestion: $<(id: string) => Promise<void>>(async (id) => {
      if (id) {
        try {
          await api.delete(`/question/${id}`);
        } catch {
          // Ignore server-side failure; still remove from local state.
        }
      }
      state.questions = state.questions.filter((q) => q.questionId !== id);
      state.total = Math.max(0, state.total - 1);
      if (state.activeQuestion?.questionId === id) {
        state.activeQuestion = null;
      }
    }),
    setSearchQuery: $((query: string) => {
      state.searchQuery = query;
    }),
  };

  useVisibleTask$(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (token) {
      store.loadQuestions();
    }
  });

  useContextProvider(QuestionContext, store);

  return <Slot />;
});

export { parseTimestamp };
