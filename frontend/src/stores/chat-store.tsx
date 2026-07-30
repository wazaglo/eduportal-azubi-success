import {
  component$,
  createContextId,
  useContextProvider,
  useContext,
  useStore,
  Slot,
  $,
  type QRL,
} from "@builder.io/qwik";

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
}

export interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  isTyping: boolean;
  searchQuery: string;
}

export interface ChatStore {
  state: ChatState;
  sendMessage: QRL<(content: string) => void>;
  selectConversation: QRL<(id: string) => void>;
  createConversation: QRL<() => void>;
  deleteConversation: QRL<(id: string) => void>;
  setSearchQuery: QRL<(query: string) => void>;
}

export const ChatContext = createContextId<ChatStore>("chat-context");

export function useChat(): ChatStore {
  return useContext(ChatContext);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    title: "Homework Help - Calculus",
    lastMessage: "Can you help me understand derivatives?",
    updatedAt: Date.now() - 3600000,
    unread: true,
    messages: [
      {
        id: "m1",
        content: "Can you help me understand derivatives?",
        role: "user",
        timestamp: Date.now() - 7200000,
        conversationId: "1",
      },
      {
        id: "m2",
        content: "Of course! Derivatives measure the rate of change of a function. Think of it as finding the slope at any point on a curve. The derivative of x^n is n*x^(n-1). Would you like me to walk through an example?",
        role: "assistant",
        timestamp: Date.now() - 7100000,
        conversationId: "1",
        sources: [
          {
            title: "Introduction to Calculus: Derivatives & Integrals",
            snippet: "Section 2.1 - The derivative as a rate of change",
          },
          {
            title: "Calculus Reference Sheet",
            snippet: "Derivative rules and formulas",
          },
        ],
      },
    ],
  },
  {
    id: "2",
    title: "Study Tips",
    lastMessage: "What are effective study techniques?",
    updatedAt: Date.now() - 86400000,
    unread: false,
    messages: [
      {
        id: "m3",
        content: "What are effective study techniques?",
        role: "user",
        timestamp: Date.now() - 90000000,
        conversationId: "2",
      },
      {
        id: "m4",
        content: "Here are some evidence-based study techniques:\n1. Active Recall - Test yourself regularly\n2. Spaced Repetition - Review material at increasing intervals\n3. Pomodoro Technique - Study in 25-min focused sessions\n4. Interleaving - Mix different topics during study sessions",
        role: "assistant",
        timestamp: Date.now() - 89900000,
        conversationId: "2",
      },
    ],
  },
  {
    id: "3",
    title: "Essay Review",
    lastMessage: "Can you check my essay structure?",
    updatedAt: Date.now() - 172800000,
    unread: false,
    messages: [
      {
        id: "m5",
        content: "Can you check my essay structure?",
        role: "user",
        timestamp: Date.now() - 180000000,
        conversationId: "3",
      },
    ],
  },
];

export const ChatProvider = component$(() => {
  const state = useStore<ChatState>({
    conversations: DEMO_CONVERSATIONS,
    activeConversation: null,
    isTyping: false,
    searchQuery: "",
  });

  const store: ChatStore = {
    state,
    sendMessage: $((content: string) => {
      if (!state.activeConversation) {
        const newConv: Conversation = {
          id: generateId(),
          title: content.substring(0, 40) + (content.length > 40 ? "..." : ""),
          lastMessage: content,
          updatedAt: Date.now(),
          unread: false,
          messages: [],
        };
        state.conversations.unshift(newConv);
        state.activeConversation = newConv;
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

      setTimeout(() => {
        const aiMsg: Message = {
          id: generateId(),
          content: "That's a great question! Let me help you with that. I'm analyzing your query and will provide a detailed response shortly.",
          role: "assistant",
          timestamp: Date.now(),
          conversationId: state.activeConversation!.id,
        };
        state.activeConversation!.messages = [...state.activeConversation!.messages, aiMsg];
        state.isTyping = false;
      }, 1500);
    }),
    selectConversation: $((id: string) => {
      const conv = state.conversations.find((c) => c.id === id);
      if (conv) {
        state.activeConversation = conv;
        conv.unread = false;
      }
    }),
    createConversation: $(() => {
      const newConv: Conversation = {
        id: generateId(),
        title: "New Conversation",
        lastMessage: "",
        updatedAt: Date.now(),
        unread: false,
        messages: [],
      };
      state.conversations.unshift(newConv);
      state.activeConversation = newConv;
    }),
    deleteConversation: $((id: string) => {
      state.conversations = state.conversations.filter((c) => c.id !== id);
      if (state.activeConversation?.id === id) {
        state.activeConversation = null;
      }
    }),
    setSearchQuery: $((query: string) => {
      state.searchQuery = query;
    }),
  };

  useContextProvider(ChatContext, store);

  return <Slot />;
});
