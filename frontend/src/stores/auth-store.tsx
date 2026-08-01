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
import { api } from "~/utils/api-client";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: "student" | "admin" | "support";
  verified: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingEmail: string | null;
}

export interface AuthStore {
  state: AuthState;
  login: QRL<(email: string, password: string) => Promise<void>>;
  register: QRL<(data: RegisterData) => Promise<void>>;
  logout: QRL<() => void>;
  fetchProfile: QRL<() => Promise<void>>;
  verifyEmail: QRL<(code: string) => Promise<void>>;
  setUser: QRL<(user: User) => void>;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "student" | "admin";
}

interface AuthApiResponse {
  user: {
    userId: string;
    email: string;
    fullName: string;
    role: "student" | "admin" | "support";
  };
  tokens: {
    accessToken: string;
    idToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  } | null;
}

interface ProfileResponse {
  profile: {
    userId: string;
    email: string;
    fullName: string;
    role: "student" | "admin" | "support";
    isActive: boolean;
    [key: string]: unknown;
  };
}

function mapUser(u: AuthApiResponse["user"]): User {
  return {
    id: u.userId,
    email: u.email,
    name: u.fullName,
    role: u.role,
    verified: true,
  };
}

export const AuthContext = createContextId<AuthStore>("auth-context");

export function useAuth(): AuthStore {
  return useContext(AuthContext);
}

export const AuthProvider = component$(() => {
  const state = useStore<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    pendingEmail: null,
  });

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    const saved = localStorage.getItem("auth_user");
    if (token && saved && !state.user) {
      try {
        state.token = token;
        state.user = JSON.parse(saved);
        state.isAuthenticated = true;
      } catch {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    }
  }

  const store: AuthStore = {
    state,
    login: $<(email: string, password: string) => Promise<void>>(async (email, password) => {
      state.isLoading = true;
      try {
        const res = await api.post<{ data: AuthApiResponse }>("/auth/login", { email, password });
        const { user, tokens } = res.data;
        if (!tokens) {
          throw new Error("Account is not verified yet");
        }
        const authToken = tokens.idToken ?? tokens.accessToken;
        const mapped = mapUser(user);
        state.token = authToken;
        state.user = mapped;
        state.isAuthenticated = true;
        if (typeof window !== "undefined") {
          localStorage.setItem("auth_token", authToken);
          localStorage.setItem("auth_user", JSON.stringify(mapped));
        }
      } finally {
        state.isLoading = false;
      }
    }),
    register: $<(data: RegisterData) => Promise<void>>(async (data) => {
      state.isLoading = true;
      try {
        const res = await api.post<{ data: AuthApiResponse }>("/auth/register", {
          email: data.email,
          password: data.password,
          fullName: data.name,
          role: data.role,
        });
        const { user, tokens } = res.data;
        const mapped = mapUser(user);
        state.pendingEmail = data.email;
        if (tokens) {
          const authToken = tokens.idToken ?? tokens.accessToken;
          state.token = authToken;
          state.user = mapped;
          state.isAuthenticated = true;
          if (typeof window !== "undefined") {
            localStorage.setItem("auth_token", authToken);
            localStorage.setItem("auth_user", JSON.stringify(mapped));
          }
        } else {
          state.token = null;
          state.user = null;
          state.isAuthenticated = false;
        }
      } finally {
        state.isLoading = false;
      }
    }),
    logout: $(() => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.pendingEmail = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    }),
    fetchProfile: $<() => Promise<void>>(async () => {
      if (!state.token) return;
      const res = await api.get<{ data: ProfileResponse }>("/user/profile");
      const { profile } = res.data;
      const mapped: User = {
        id: profile.userId,
        email: profile.email,
        name: profile.fullName,
        role: profile.role,
        verified: true,
      };
      state.user = mapped;
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_user", JSON.stringify(mapped));
      }
    }),
    verifyEmail: $<(code: string) => Promise<void>>(async (code) => {
      const email = state.pendingEmail;
      if (!email) throw new Error("No pending email to verify");
      await api.post("/auth/verify-email", { email, code });
      state.pendingEmail = null;
    }),
    setUser: $((user: User) => {
      state.user = user;
      state.isAuthenticated = true;
    }),
  };

  useContextProvider(AuthContext, store);

  return <Slot />;
});
