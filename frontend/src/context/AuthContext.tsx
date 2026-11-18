import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokens } from "../lib/api";
import type { User } from "../lib/types";

interface RegisterInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: "student" | "tutor";
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!tokens.access) { setUser(null); return; }
    try {
      const { data } = await api.get<User>("/auth/me/");
      setUser(data);
    } catch {
      tokens.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
    const onLogout = () => setUser(null);
    window.addEventListener("edumind:logout", onLogout);
    return () => window.removeEventListener("edumind:logout", onLogout);
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login/", { email, password });
    tokens.set(data.access, data.refresh);
    await refreshUser();
  };

  const register = async (input: RegisterInput) => {
    const { data } = await api.post("/auth/register/", input);
    tokens.set(data.tokens.access, data.tokens.refresh);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      if (tokens.refresh) await api.post("/auth/logout/", { refresh: tokens.refresh });
    } finally {
      tokens.clear();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
