"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeId = "dark" | "modern" | "brand";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDom(theme: ThemeId) {
  // We attach on :root for CSS variables.
  const root = document.documentElement;
  if (theme === "dark") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("dark");

  useEffect(() => {
    const saved = (typeof window !== "undefined" ? window.localStorage.getItem("theme") : null) as ThemeId | null;
    const initial: ThemeId = saved === "modern" || saved === "brand" || saved === "dark" ? saved : "dark";
    setThemeState(initial);
    applyThemeToDom(initial);
  }, []);

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    try {
      window.localStorage.setItem("theme", t);
    } catch {
      // ignore
    }
    applyThemeToDom(t);
  };

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
