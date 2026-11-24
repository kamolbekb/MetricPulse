"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getStoredToken, setStoredToken, type User, type Workspace } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  workspace: Workspace | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: { full_name: string; email: string; password: string; title?: string }) => Promise<User>;
  demoLogin: (role: "Admin" | "Viewer") => Promise<User>;
  logout: () => void;
  refreshWorkspace: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshWorkspace = useCallback(async () => {
    try {
      const ws = await api.getWorkspace();
      setWorkspace(ws);
    } catch {
      // ignore if unauthenticated
    }
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [me, ws] = await Promise.all([api.getMe(), api.getWorkspace()]);
        if (!cancelled) {
          setUser(me);
          setWorkspace(ws);
        }
      } catch {
        setStoredToken(null);
        if (!cancelled) {
          setUser(null);
          setWorkspace(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const hydrateAfterAuth = async (token: string, authedUser: User) => {
    setStoredToken(token);
    setUser(authedUser);
    try {
      const ws = await api.getWorkspace();
      setWorkspace(ws);
    } catch {
      // non-fatal
    }
    return authedUser;
  };

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    return hydrateAfterAuth(res.access_token, res.user);
  };

  const register = async (payload: {
    full_name: string;
    email: string;
    password: string;
    title?: string;
  }) => {
    const res = await api.register(payload);
    return hydrateAfterAuth(res.access_token, res.user);
  };

  const demoLogin = async (role: "Admin" | "Viewer") => {
    const res = await api.demoLogin(role);
    return hydrateAfterAuth(res.access_token, res.user);
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setWorkspace(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspace,
        loading,
        isAdmin: user?.role === "Admin",
        login,
        register,
        demoLogin,
        logout,
        refreshWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
