// Short messages shown at the bottom of the planner when something could not be saved.
import { useSyncExternalStore } from "react";

export interface Notice {
  id: number;
  title: string;
  detail?: string;
}

let notices: Notice[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function dismissNotice(id: number) {
  notices = notices.filter((notice) => notice.id !== id);
  emit();
}

export function notify(title: string, detail?: string) {
  const id = nextId++;
  notices = [...notices.slice(-2), { id, title, detail }];
  emit();
  window.setTimeout(() => dismissNotice(id), 6000);
}

/** The words of an error, without leaking anything technical when there are none. */
export const errorText = (error: unknown, fallback = "Please try again.") =>
  error instanceof Error && error.message && !/abort/i.test(error.message) ? error.message : fallback;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const useNotices = () => useSyncExternalStore(subscribe, () => notices, () => notices);
