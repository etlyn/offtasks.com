import { resetTheme } from "./theme";

export const OFFTASKS_STORAGE_KEYS = {
  theme: "offtasks-theme",
} as const;

/** Removes everything Offtasks keeps in this browser: appearance, goal colours and preferences. */
export const clearLocalOfftasksState = () => {
  if (typeof window === "undefined") {
    return;
  }

  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith("offtasks-")) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }

  resetTheme();
};
