import React, { createContext, useContext, useEffect, useState } from "react";
import { api, apiErrText } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [enums, setEnums] = useState(null);
  const [settings, setSettings] = useState(null);
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem("nspr_lang") || "en"; } catch { return "en"; }
  });

  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem("nspr_lang", l); } catch {}
  };

  // Bilingual text resolver: prefer *_ur when lang === "ur" and value is non-empty
  const t = (enText, urText) => {
    if (lang === "ur" && urText && String(urText).trim()) return urText;
    return enText;
  };
  // Convenience: get a field pair from settings automatically (e.g. tf("site_name"))
  const tf = (key) => {
    if (!settings) return "";
    return t(settings[key], settings[`${key}_ur`]);
  };

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
    return () => { mounted = false; };
  }, []);

  // Apply favicon + accent color to <html> whenever settings change
  useEffect(() => {
    if (!settings) return;
    // Accent color -> CSS variable
    const accent = settings.accent_color || "#C48F38";
    document.documentElement.style.setProperty("--brand-accent", accent);
    // Favicon
    if (settings.favicon_data_url) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = settings.favicon_data_url;
    }
    // Page title reflects site name
    if (settings.site_name) document.title = settings.site_name;
  }, [settings]);

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
    <AuthContext.Provider value={{ user, setUser, login, register, logout, enums, settings, setSettings, refreshSettings, lang, setLang, t, tf }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
