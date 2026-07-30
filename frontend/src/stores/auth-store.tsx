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

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: "student" | "admin";
  verified: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthStore {
  state: AuthState;
  login: QRL<(email: string, password: string) => Promise<void>>;
  register: QRL<(data: RegisterData) => Promise<void>>;
  logout: QRL<() => void>;
  setUser: QRL<(user: User) => void>;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "student" | "admin";
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
  });

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("mock_user");
    if (saved && !state.user) {
      state.user = JSON.parse(saved);
      state.isAuthenticated = true;
    }
  }

  const store: AuthStore = {
    state,
    login: $<(email: string, _password: string) => Promise<void>>(async (email) => {
      state.isLoading = true;
      const mockUser: User = {
        id: "mock-1",
        email,
        name: email.split("@")[0],
        role: "student",
        verified: true,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("mock_user", JSON.stringify(mockUser));
      }
      state.user = mockUser;
      state.isAuthenticated = true;
      state.isLoading = false;
    }),
    register: $<(data: RegisterData) => Promise<void>>(async (data) => {
      state.isLoading = true;
      const mockUser: User = {
        id: "mock-1",
        email: data.email,
        name: data.name,
        role: data.role,
        verified: false,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("mock_user", JSON.stringify(mockUser));
      }
      state.user = mockUser;
      state.isAuthenticated = true;
      state.isLoading = false;
    }),
    logout: $(() => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      if (typeof window !== "undefined") {
        localStorage.removeItem("mock_user");
      }
    }),
    setUser: $((user: User) => {
      state.user = user;
      state.isAuthenticated = true;
    }),
  };

  useContextProvider(AuthContext, store);

  return <Slot />;
});
