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

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  conversationId: string;
  sources?: KnowledgeSource[];
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: number;
  unread: boolean;
  messages: Message[];
  messageCount?: number;
}

export interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  isTyping: boolean;
  searchQuery: string;
}

export interface ChatStore {
  state: ChatState;
  loadConversations: QRL<() => Promise<void>>;
  sendMessage: QRL<(content: string) => Promise<void>>;
  selectConversation: QRL<(id: string) => Promise<void>>;
  createConversation: QRL<() => void>;
  deleteConversation: QRL<(id: string) => Promise<void>>;
  setSearchQuery: QRL<(query: string) => void>;
}

export const ChatContext = createContextId<ChatStore>("chat-context");

export function useChat(): ChatStore {
  return useContext(ChatContext);
}

interface BackendConversation {
  conversationId: string;
  title: string;
  status: string;
  queryType?: string;
  summary?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

interface BackendMessage {
  messageId: string;
  conversationId: string;
  sender: "user" | "ai" | "system";
  content: string;
  status: string;
  queryType?: string;
  metadata?: {
    source?: string;
    cached?: boolean;
    documentTitle?: string;
  };
  createdAt: string;
}

interface SendMessageResponse {
  userMessage: BackendMessage;
  aiMessage?: BackendMessage;
  conversation: BackendConversation;
  cached: boolean;
  source: string;
  processingTimeMs: number;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function parseTimestamp(value: string | undefined): number {
  if (!value) return Date.now();
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? Date.now() : ts;
}

function mapBackendMessage(msg: BackendMessage): Message {
  const sources: KnowledgeSource[] = [];
  if (msg.metadata?.documentTitle) {
    sources.push({
      title: msg.metadata.documentTitle,
      snippet: msg.metadata.source ? `Source: ${msg.metadata.source}` : "Source: knowledge base",
    });
  }
  return {
    id: msg.messageId,
    content: msg.content,
    role: msg.sender === "user" ? "user" : "assistant",
    timestamp: parseTimestamp(msg.createdAt),
    conversationId: msg.conversationId,
    ...(sources.length ? { sources } : {}),
  };
}

function mapBackendConversation(conv: BackendConversation): Conversation {
  return {
    id: conv.conversationId,
    title: conv.title || "New Conversation",
    lastMessage: conv.title,
    updatedAt: parseTimestamp(conv.lastMessageAt || conv.updatedAt),
    unread: false,
    messages: [],
    messageCount: conv.messageCount ?? 0,
  };
}

export const ChatProvider = component$(() => {
  const state = useStore<ChatState>({
    conversations: [],
    activeConversation: null,
    isTyping: false,
    searchQuery: "",
  });

  const store: ChatStore = {
    state,
    loadConversations: $<() => Promise<void>>(async () => {
      try {
        const res = await api.get<{ data: BackendConversation[] }>("/chat/conversations", {
          params: { limit: "100" },
        });
        state.conversations = (res.data ?? []).map(mapBackendConversation);
      } catch {
        state.conversations = [];
      }
    }),
    sendMessage: $<(content: string) => Promise<void>>(async (content) => {
      if (!state.activeConversation) {
        const placeholder: Conversation = {
          id: "",
          title: content.substring(0, 40) + (content.length > 40 ? "..." : ""),
          lastMessage: content,
          updatedAt: Date.now(),
          unread: false,
          messages: [],
        };
        state.conversations.unshift(placeholder);
        state.activeConversation = placeholder;
      }

      const userMsg: Message = {
        id: generateId(),
        content,
        role: "user",
        timestamp: Date.now(),
        conversationId: state.activeConversation!.id,
      };
      state.activeConversation!.messages = [...state.activeConversation!.messages, userMsg];
      state.activeConversation!.lastMessage = content;
      state.activeConversation!.updatedAt = Date.now();
      state.isTyping = true;

      try {
        const res = await api.post<{ data: SendMessageResponse }>("/chat/send", {
          content,
          requireAsync: false,
          ...(state.activeConversation!.id ? { conversationId: state.activeConversation!.id } : {}),
        });
        const { aiMessage, conversation } = res.data;

        if (!state.activeConversation!.id) {
          state.activeConversation!.id = conversation.conversationId;
        }

        const aiMsg: Message | null = aiMessage ? mapBackendMessage(aiMessage) : null;
        if (aiMsg) {
          state.activeConversation!.messages = [...state.activeConversation!.messages, aiMsg];
          state.activeConversation!.lastMessage = aiMsg.content;
        }

        const index = state.conversations.findIndex((c) => c.id === conversation.conversationId);
        const mapped = mapBackendConversation(conversation);
        mapped.messages = state.activeConversation!.messages;
        if (aiMsg) mapped.lastMessage = aiMsg.content;
        if (index >= 0) {
          state.conversations[index] = mapped;
        } else {
          state.conversations.unshift(mapped);
        }
        state.activeConversation = mapped;
        state.activeConversation.updatedAt = Date.now();
      } catch {
        const fallback: Message = {
          id: generateId(),
          content: "Sorry, I couldn't reach the assistant right now. Please try again.",
          role: "assistant",
          timestamp: Date.now(),
          conversationId: state.activeConversation!.id,
        };
        state.activeConversation!.messages = [...state.activeConversation!.messages, fallback];
        state.activeConversation!.lastMessage = fallback.content;
      } finally {
        state.isTyping = false;
      }
    }),
    selectConversation: $<(id: string) => Promise<void>>(async (id) => {
      const local = state.conversations.find((c) => c.id === id);
      try {
        const res = await api.get<{ data: { conversation: BackendConversation; messages: BackendMessage[] } }>(
          `/chat/conversations/${id}`
        );
        const { conversation, messages } = res.data;
        const mapped = mapBackendConversation(conversation);
        mapped.messages = (messages ?? []).map(mapBackendMessage);
        const last = mapped.messages[mapped.messages.length - 1];
        if (last) mapped.lastMessage = last.content;
        const index = state.conversations.findIndex((c) => c.id === id);
        if (index >= 0) {
          state.conversations[index] = mapped;
        } else {
          state.conversations.unshift(mapped);
        }
        state.activeConversation = mapped;
      } catch {
        if (local) state.activeConversation = local;
      }
    }),
    createConversation: $(() => {
      const newConv: Conversation = {
        id: "",
        title: "New Conversation",
        lastMessage: "",
        updatedAt: Date.now(),
        unread: false,
        messages: [],
      };
      state.conversations.unshift(newConv);
      state.activeConversation = newConv;
    }),
    deleteConversation: $<(id: string) => Promise<void>>(async (id) => {
      if (id) {
        try {
          await api.delete(`/chat/conversations/${id}`);
        } catch {
          // Ignore server-side failure; still remove from local state.
        }
      }
      state.conversations = state.conversations.filter((c) => c.id !== id);
      if (state.activeConversation?.id === id) {
        state.activeConversation = null;
      }
    }),
    setSearchQuery: $((query: string) => {
      state.searchQuery = query;
    }),
  };

  useVisibleTask$(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (token) {
      store.loadConversations();
    }
  });

  useContextProvider(ChatContext, store);

  return <Slot />;
});
