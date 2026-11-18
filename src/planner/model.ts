// The planner's data, in the same shape the mobile app stores and syncs.
import { shiftDay, today } from "./dates";

export type TaskGroup = "today" | "tomorrow" | "upcoming" | "close";

export interface PlannerTask {
  /** A task-table id, or "note-task:<note>:<task>" for a task written inside a note. */
  id: string;
  content: string;
  isComplete: boolean;
  /** 0 none, 1 low, 2 medium, 3 high */
  priority: number;
  target_group: TaskGroup;
  date: string | null;
  /** The goal's name. */
  label: string | null;
  completed_at: string | null;
  inserted_at?: string;
  execution_target?: "codex" | null;
  /** Where a goal task stands when work on it is tracked: ready, in_progress… */
  work_stage?: string;
  /** Set for tasks that live inside a note. */
  noteId?: string;
  noteTitle?: string;
}

export type TaskChanges = Partial<
  Pick<PlannerTask, "content" | "isComplete" | "priority" | "target_group" | "date" | "label" | "completed_at">
>;

export interface NoteTask {
  id: string;
  content: string;
  isComplete: boolean;
  priority: number;
  target_group: TaskGroup;
  date: string | null;
  label?: string | null;
  completed_at?: string | null;
  inserted_at?: string;
}

export const noteTones = [
  { id: "paper", name: "Paper", light: "#FAFCFB", dark: "#19221F", accent: "#84968C" },
  { id: "sage", name: "Sage", light: "#EEF5EF", dark: "#1C2C23", accent: "#76957E" },
  { id: "sand", name: "Sand", light: "#F9F4E9", dark: "#302A1F", accent: "#AF9969" },
  { id: "rose", name: "Rose", light: "#F9EFF1", dark: "#302329", accent: "#B78B98" },
  { id: "lilac", name: "Lilac", light: "#F3F0F8", dark: "#282333", accent: "#9C8AAF" },
  { id: "mist", name: "Mist", light: "#EEF4F6", dark: "#1F2A30", accent: "#7D9AA6" },
] as const;
export type NoteTone = (typeof noteTones)[number]["id"];
export const noteTone = (id?: string) => noteTones.find((tone) => tone.id === id) ?? noteTones[0];

export interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  updatedAt: string;
  tone?: NoteTone;
  tasks?: NoteTask[];
}

/** Goal briefs are stored as notes but are edited from Goals, with revision checks. */
export const isBriefId = (id: string) => id.startsWith("offtask-prd:");

export const priorities = [
  { value: 0, label: "None" },
  { value: 1, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 3, label: "High" },
] as const;
export const priorityColors = ["#94a3b8", "#4f86ff", "#f59e0b", "#ff4d6d"] as const;

// ---------- Scheduling (mirrors the mobile app's rules) ----------

export const groupForDate = (date: string | null): Exclude<TaskGroup, "close"> => {
  if (!date) return "upcoming";
  if (date <= today()) return "today";
  if (date === shiftDay(today(), 1)) return "tomorrow";
  return "upcoming";
};

/** A task's day: its own date, or the day its group stands for when it has none. */
export const scheduledDay = (task: Pick<PlannerTask, "date" | "target_group">) =>
  task.date ?? (task.target_group === "today" ? today() : task.target_group === "tomorrow" ? shiftDay(today(), 1) : null);

export const tasksForDay = <T extends PlannerTask>(tasks: T[], day: string) =>
  tasks.filter((task) => scheduledDay(task) === day);

/** Later holds everything without a date. */
export const laterTasks = <T extends PlannerTask>(tasks: T[]) => tasks.filter((task) => !task.date);

const fold = (value: string) => value.trim().toLocaleLowerCase();
export const goalKey = fold;

export const tasksForGoal = <T extends PlannerTask>(tasks: T[], goal: string) =>
  tasks.filter((task) => !!task.label && fold(task.label) === fold(goal));

export interface GoalSummary {
  name: string;
  total: number;
  completed: number;
}

/** Saved goals plus any goal named on a task, alphabetically. */
export function goalSummaries(tasks: PlannerTask[], goals: string[]): GoalSummary[] {
  const names = new Map<string, string>();
  for (const name of [...goals, ...tasks.map((task) => task.label ?? "")]) {
    const label = name.trim();
    if (label) names.set(fold(label), label);
  }
  return [...names.values()]
    .sort((left, right) => left.localeCompare(right))
    .map((name) => {
      const matches = tasksForGoal(tasks, name);
      return { name, total: matches.length, completed: matches.filter((task) => task.isComplete).length };
    });
}

/** Unfinished tasks never move down a list; finished ones settle at the bottom. */
export const openFirst = <T extends PlannerTask>(tasks: T[]) =>
  [...tasks].sort((left, right) => Number(left.isComplete) - Number(right.isComplete));

/** Only an explicit opt-in may clear an unfinished task's past date. */
export const isPastAndOpen = (task: Pick<PlannerTask, "isComplete" | "date">) =>
  !task.isComplete && !!task.date && /^\d{4}-\d{2}-\d{2}$/.test(task.date) && task.date < today();

// ---------- Tasks inside notes ----------

const notePrefix = "note-task:";
export const isNoteTaskId = (id: string) => id.startsWith(notePrefix);
export const noteTaskId = (noteId: string, taskId: string) =>
  `${notePrefix}${encodeURIComponent(noteId)}:${encodeURIComponent(taskId)}`;

export const tasksInNotes = (notes: Note[]): PlannerTask[] =>
  notes.flatMap((note) =>
    (note.tasks ?? []).map((task) => ({
      ...task,
      id: noteTaskId(note.id, task.id),
      label: task.label ?? null,
      completed_at: task.completed_at ?? null,
      noteId: note.id,
      noteTitle: note.title,
    })),
  );

export const newLocalId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

// ---------- Reading rows the server returns ----------

const groups: TaskGroup[] = ["today", "tomorrow", "upcoming", "close"];

function readNoteTasks(value: unknown): NoteTask[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tasks: NoteTask[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (
      !item ||
      typeof item.id !== "string" ||
      !item.id ||
      seen.has(item.id) ||
      typeof item.content !== "string" ||
      !item.content.trim() ||
      typeof item.isComplete !== "boolean"
    )
      continue;
    seen.add(item.id);
    tasks.push({
      ...item,
      priority: Number.isInteger(item.priority) && item.priority >= 0 && item.priority <= 3 ? item.priority : 0,
      target_group: groups.includes(item.target_group) ? item.target_group : "upcoming",
      date: typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : null,
    });
  }
  return tasks;
}

/** A stored note, or null when the row is not a note this app can show. */
export function readNote(id: unknown, value: unknown): Note | null {
  if (typeof id !== "string" || !value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (
    data.id !== id ||
    typeof data.title !== "string" ||
    typeof data.body !== "string" ||
    typeof data.pinned !== "boolean" ||
    typeof data.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(data.updatedAt))
  )
    return null;
  const tasks = readNoteTasks(data.tasks);
  // Unknown fields are kept so a newer app's additions survive an edit here.
  return {
    ...(data as unknown as Note),
    tone: noteTones.some((tone) => tone.id === data.tone) ? (data.tone as NoteTone) : undefined,
    ...(tasks ? { tasks } : {}),
  };
}

export function readTask(row: Record<string, unknown>): PlannerTask | null {
  if (typeof row.id !== "string" || typeof row.content !== "string") return null;
  const done = typeof row.isComplete === "boolean" ? row.isComplete : row.is_complete === true;
  const label = typeof row.label === "string" ? row.label : typeof row.category === "string" ? row.category : null;
  return {
    id: row.id,
    content: row.content,
    isComplete: done,
    priority: typeof row.priority === "number" ? Math.min(3, Math.max(0, Math.round(row.priority))) : 0,
    target_group: groups.includes(row.target_group as TaskGroup) ? (row.target_group as TaskGroup) : "upcoming",
    date: typeof row.date === "string" && row.date ? row.date.slice(0, 10) : null,
    label: label && label.trim() ? label : null,
    completed_at: typeof row.completed_at === "string" ? row.completed_at : null,
    inserted_at: typeof row.inserted_at === "string" ? row.inserted_at : undefined,
    execution_target: row.execution_target === "codex" ? "codex" : null,
    work_stage: typeof row.work_stage === "string" ? row.work_stage : undefined,
  };
}

// ---------- Notes list ----------

export function filterNotes(notes: Note[], pinnedOnly: boolean) {
  return notes
    .filter((note) => !pinnedOnly || note.pinned)
    .sort(
      (left, right) => Number(right.pinned) - Number(left.pinned) || right.updatedAt.localeCompare(left.updatedAt),
    );
}

export interface NoteDraft {
  title: string;
  body: string;
  tasks?: NoteTask[];
}

/** The note as it should be saved; throws when there is nothing to save. */
export function composeNote(draft: NoteDraft, previous?: Note, now = new Date().toISOString()): Note {
  const title = draft.title.trim();
  const body = draft.body.trim();
  if (!title && !body && !draft.tasks?.length) throw new Error("Add a title or note before saving.");
  const tasks = draft.tasks ?? previous?.tasks;
  return {
    ...(previous ?? {}),
    id: previous?.id ?? newLocalId(),
    title: title || "Untitled note",
    body,
    updatedAt: now,
    pinned: previous?.pinned ?? false,
    ...(tasks ? { tasks } : {}),
  };
}
