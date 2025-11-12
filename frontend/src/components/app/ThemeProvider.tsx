import { ReactNode, useCallback, useMemo, useState } from "react";
import { Theme, ThemeContext } from "./theme-context";

const STORAGE_KEY = "sdr-theme";

function getInitialTheme(): Theme {
  if (
    typeof window === "undefined" ||
    typeof window.localStorage.getItem === "undefined"
  ) {
    return "dark";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.setAttribute("data-theme", theme);
}

function persistTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  if (typeof window.localStorage?.setItem === "function") {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const initial = getInitialTheme();
    applyTheme(initial);
    persistTheme(initial);
    return initial;
  });

  const setTheme = useCallback(
    (next: ((prev: Theme) => Theme) | Theme) => {
      setThemeState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        if (resolved === prev) {
          return prev;
        }
        applyTheme(resolved);
        persistTheme(resolved);
        return resolved;
      });
    },
    []
  );

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
