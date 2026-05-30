import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface AppAuthUser {
  id: number;
  nome: string;
  email: string;
  perfil: "admin" | "visualizacao";
  senhaTemporaria?: boolean;
}

interface AppAuthContextValue {
  user: AppAuthUser | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<{ success: boolean; error?: string; senhaTemporaria?: boolean }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

export function AppAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/app/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = useCallback(async (email: string, senha: string) => {
    try {
      const res = await fetch("/api/app/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        return { success: true, senhaTemporaria: data.user?.senhaTemporaria ?? false };
      }
      return { success: false, error: data.error || "Erro ao fazer login" };
    } catch {
      return { success: false, error: "Erro de conexão" };
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/app/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    await fetchMe();
  }, [fetchMe]);

  // alias para compatibilidade com PrimeiroAcesso.tsx
  const refreshUser = refresh;

  return (
    <AppAuthContext.Provider value={{ user, loading, login, logout, refresh, refreshUser }}>
      {children}
    </AppAuthContext.Provider>
  );
}

export function useAppAuth() {
  const ctx = useContext(AppAuthContext);
  if (!ctx) throw new Error("useAppAuth must be used inside AppAuthProvider");
  return ctx;
}
