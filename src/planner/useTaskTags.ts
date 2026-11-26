import { useCallback, useEffect, useMemo, useState } from "react";
import { newLocalId } from "./model";
import { applyTagChanges, forgetTaskTags, readTagState, removeTag, saveTag, taskTagIds, type TagState } from "./tags";

const storageError = () => new Error("Tags couldn’t be saved in this browser. Check your browser’s storage settings.");

function load(key: string) {
  try {
    return readTagState(localStorage.getItem(key));
  } catch {
    return readTagState(null);
  }
}

export function useTaskTags(owner: string) {
  const key = `offtasks-task-tags:${owner}`;
  const [state, setState] = useState(() => load(key));
  useEffect(() => {
    const receive = (event: StorageEvent) => {
      if (event.key === key || event.key === null) setState(load(key));
    };
    window.addEventListener("storage", receive);
    return () => window.removeEventListener("storage", receive);
  }, [key]);

  const write = useCallback((update: (current: TagState) => TagState) => {
    let current: TagState;
    try {
      current = readTagState(localStorage.getItem(key));
    } catch {
      throw storageError();
    }
    const next = update(current);
    if (next !== current) {
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        throw storageError();
      }
    }
    setState(next);
  }, [key]);

  return useMemo(() => ({
    ...state,
    forTask: (id: string) => {
      const assigned = taskTagIds(state, id);
      return state.tags.filter((tag) => assigned.includes(tag.id));
    },
    create: (name: string) => {
      const id = newLocalId();
      write((current) => saveTag(current, id, name));
      return id;
    },
    rename: (id: string, name: string) => write((current) => {
      if (!current.tags.some((tag) => tag.id === id)) throw new Error("This tag has been removed.");
      return saveTag(current, id, name);
    }),
    remove: (id: string) => write((current) => removeTag(current, id)),
    assign: (task: string, added: string[], removed: string[]) => write((current) => applyTagChanges(current, task, added, removed)),
    forget: (ids: string[]) => {
      if (!ids.length) return;
      try {
        write((current) => forgetTaskTags(current, ids));
      } catch {
        // The tasks are already deleted. Unreadable local tags cannot bring them back.
      }
    },
  }), [state, write]);
}
