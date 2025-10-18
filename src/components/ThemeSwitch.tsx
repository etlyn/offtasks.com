import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "offtasks-theme";
type ThemeMode = "light" | "dark";

const applyTheme = (theme: ThemeMode) => {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

export const ThemeSwitch = () => {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = storedTheme ?? (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return (
    <button
      type="button"
      aria-label="Toggle Dark Mode"
      className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/80 text-zinc-600 shadow-[0_10px_30px_rgba(15,118,230,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-md focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 dark:border-zinc-700/60 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:text-sky-300"
      onClick={toggleTheme}
    >
      {mounted && theme === "dark" ? (
        <Moon className="h-5 w-5 transition-transform duration-200 group-hover:scale-105" aria-hidden="true" />
      ) : (
        <Sun className="h-5 w-5 transition-transform duration-200 group-hover:scale-105" aria-hidden="true" />
      )}
    </button>
  );
};
