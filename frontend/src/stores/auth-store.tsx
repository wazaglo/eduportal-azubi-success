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
    isLoading: true,
  });

  const store: AuthStore = {
    state,
    login: $<(_email: string, _password: string) => Promise<void>>(async () => {
      state.isLoading = true;
      try {
        state.isAuthenticated = true;
        state.isLoading = false;
      } catch {
        state.isLoading = false;
        throw new Error("Login failed");
      }
    }),
    register: $<(_data: RegisterData) => Promise<void>>(async () => {
      state.isLoading = true;
      try {
        state.isAuthenticated = true;
        state.isLoading = false;
      } catch {
        state.isLoading = false;
        throw new Error("Registration failed");
      }
    }),
    logout: $(() => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    }),
    setUser: $((user: User) => {
      state.user = user;
      state.isAuthenticated = true;
    }),
  };

  useContextProvider(AuthContext, store);

  return <Slot />;
});
