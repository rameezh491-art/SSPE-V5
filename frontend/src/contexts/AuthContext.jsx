import React, { createContext, useContext, useEffect, useState } from "react";
import { api, apiErrText } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = anon, obj = logged in
  const [enums, setEnums] = useState(null);
  const [settings, setSettings] = useState(null);

  const refreshSettings = async () => {
    try {
      const { data } = await api.get("/settings/site");
      setSettings(data);
      return data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        if (mounted) setUser(data);
      } catch {
        if (mounted) setUser(false);
      }
      try {
        const { data } = await api.get("/meta/enums");
        if (mounted) setEnums(data);
      } catch {}
      try {
        const { data } = await api.get("/settings/site");
        if (mounted) setSettings(data);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, error: apiErrText(e) };
    }
  };

  const register = async (payload) => {
    try {
      const { data } = await api.post("/auth/register", payload);
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, error: apiErrText(e) };
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, enums, settings, setSettings, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
