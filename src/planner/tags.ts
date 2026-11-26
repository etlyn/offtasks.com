export interface TaskTag {
  id: string;
  name: string;
}

export interface TagState {
  tags: TaskTag[];
  assignments: Record<string, string[]>;
}

export const tagNameLimit = 48;
export const tagName = (value: string) => value.trim().replace(/\s+/g, " ").normalize("NFC");
export const tagKey = (value: string) => tagName(value).toLowerCase();

export const taskTagIds = (state: TagState, id: string) =>
  Object.hasOwn(state.assignments, id) ? state.assignments[id] : [];

export const filterByTag = <Task extends { id: string }>(tasks: Task[], state: TagState, id: string) =>
  id ? tasks.filter((task) => taskTagIds(state, task.id).includes(id)) : tasks;

/** Staging shares the live backend. Keep this preview's tags in this browser. */
export function readTagState(raw: string | null): TagState {
  const empty: TagState = { tags: [], assignments: {} };
  if (!raw) return empty;
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value?.tags)) return empty;
    const ids = new Set<string>();
    const names = new Set<string>();
    const tags: TaskTag[] = [];
    for (const tag of value.tags) {
      if (typeof tag?.id !== "string" || !tag.id || ids.has(tag.id) || typeof tag.name !== "string") continue;
      const name = tagName(tag.name);
      const key = tagKey(name);
      if (!name || name.length > tagNameLimit || names.has(key)) continue;
      ids.add(tag.id);
      names.add(key);
      tags.push({ id: tag.id, name });
    }
    const assignments = Object.entries(value.assignments ?? {})
      .filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]))
      .map(([task, entries]): [string, string[]] => [
        task,
        [...new Set(entries.filter((id): id is string => typeof id === "string" && ids.has(id)))],
      ])
      .filter(([, entries]) => entries.length > 0);
    return { tags, assignments: Object.fromEntries(assignments) };
  } catch {
    return empty;
  }
}

export function saveTag(state: TagState, id: string, input: string): TagState {
  const name = tagName(input);
  if (!name) throw new Error("Enter a tag name.");
  if (name.length > tagNameLimit) throw new Error(`Use ${tagNameLimit} characters or fewer.`);
  if (state.tags.some((tag) => tag.id !== id && tagKey(tag.name) === tagKey(name))) {
    throw new Error("A tag with this name already exists.");
  }
  return {
    ...state,
    tags: [...state.tags.filter((tag) => tag.id !== id), { id, name }]
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function applyTagChanges(state: TagState, task: string, added: string[], removed: string[]): TagState {
  const current = new Set([...taskTagIds(state, task), ...added]);
  for (const id of removed) current.delete(id);
  const tagIds = state.tags.filter((tag) => current.has(tag.id)).map((tag) => tag.id);
  if (tagIds.length) return { ...state, assignments: { ...state.assignments, [task]: tagIds } };
  return forgetTaskTags(state, [task]);
}

export function forgetTaskTags(state: TagState, ids: string[]): TagState {
  if (!ids.some((id) => Object.hasOwn(state.assignments, id))) return state;
  const assignments = { ...state.assignments };
  for (const id of ids) delete assignments[id];
  return { ...state, assignments };
}

export function removeTag(state: TagState, id: string): TagState {
  return {
    tags: state.tags.filter((tag) => tag.id !== id),
    assignments: Object.fromEntries(
      Object.entries(state.assignments)
        .map(([task, ids]) => [task, ids.filter((tag) => tag !== id)] as const)
        .filter(([, ids]) => ids.length > 0),
    ),
  };
}
