"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { dictionaries, type Dict, type Lang } from "@/lib/i18n/dictionaries";

type Theme = "light" | "dark";

type AppUIContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};

const AppUIContext = createContext<AppUIContextValue | null>(null);

export function AppUIProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("hi");
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("saaf_lang") as Lang | null;
    const savedTheme = localStorage.getItem("saaf_theme") as Theme | null;
    if (savedLang === "hi" || savedLang === "en") setLangState(savedLang);
    if (savedTheme === "light" || savedTheme === "dark") setThemeState(savedTheme);
    setReady(true);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = lang === "hi" ? "hi" : "en";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("saaf_lang", lang);
    localStorage.setItem("saaf_theme", theme);
  }, [lang, theme, ready]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const setTheme = useCallback((th: Theme) => setThemeState(th), []);
  const toggleTheme = useCallback(
    () => setThemeState((th) => (th === "light" ? "dark" : "light")),
    []
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: dictionaries[lang],
      theme,
      setTheme,
      toggleTheme,
    }),
    [lang, setLang, theme, setTheme, toggleTheme]
  );

  return <AppUIContext.Provider value={value}>{children}</AppUIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(AppUIContext);
  if (!ctx) throw new Error("useUI must be inside AppUIProvider");
  return ctx;
}
