// Light or Dark, as in the mobile app: Light unless the person chose Dark.
// The choice is kept in this browser and, when signed in, with the account.
import { useSyncExternalStore } from "react";

export type ThemeMode = "Light" | "Dark";

const STORAGE_KEY = "offtasks-theme";
const listeners = new Set<() => void>();

const stored = (): ThemeMode => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "Dark" : "Light";
  } catch {
    return "Light";
  }
};

let current: ThemeMode = typeof window === "undefined" ? "Light" : stored();

export function applyTheme(mode: ThemeMode = current) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "Dark");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", mode === "Dark" ? "#09090b" : "#f4f6fb");
}

export function setTheme(mode: ThemeMode) {
  current = mode;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode === "Dark" ? "dark" : "light");
  } catch {
    // The choice still applies for this visit.
  }
  applyTheme(mode);
  listeners.forEach((listener) => listener());
}

/** Back to Light, for example after the account's data is deleted on this device. */
export function resetTheme() {
  current = "Light";
  applyTheme("Light");
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getTheme = () => current;
export const useTheme = () => useSyncExternalStore(subscribe, getTheme, () => "Light" as ThemeMode);
