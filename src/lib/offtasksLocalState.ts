import { resetTheme } from "./theme";

export const OFFTASKS_STORAGE_KEYS = {
  theme: "offtasks-theme",
} as const;

const taskTagsPrefix = "offtasks-task-tags:";
export const taskTagStorageKey = (owner: string) => `${taskTagsPrefix}${owner}`;

/** Clear planner preferences and the deleted account's tags from this browser. */
export const clearLocalOfftasksState = (owner: string) => {
  if (typeof window === "undefined") {
    return;
  }

  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith("offtasks-")) continue;
    if (key.startsWith(taskTagsPrefix) && key !== taskTagStorageKey(owner)) continue;
    keysToRemove.push(key);
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }

  resetTheme();
};
