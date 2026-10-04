import { resetCustomCategoryColors } from "@/utils/categoryConfig";

export const OFFTASKS_STORAGE_KEYS = {
  categories: "offtasks-categories",
  theme: "offtasks-theme",
  advancedMode: "offtasks-advanced-mode",
  hideCompleted: "offtasks-hide-completed",
  autoArrange: "offtasks-auto-arrange",
} as const;

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

  resetCustomCategoryColors();
  document.documentElement.classList.remove("dark");
};
