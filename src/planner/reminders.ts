import { dayKey, shiftDay } from "./dates";
import { noteTaskId, type PlannerTask } from "./model";

export interface ReminderTarget {
  task_id: string;
  note_id: string;
}

export const reminderTaskKey = ({ task_id, note_id }: ReminderTarget) =>
  note_id ? noteTaskId(note_id, task_id) : task_id;

export function reminderTarget(task: Pick<PlannerTask, "id" | "noteId">): ReminderTarget {
  return {
    task_id: task.noteId ? decodeURIComponent(task.id.split(":")[2]) : task.id,
    note_id: task.noteId ?? "",
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

export const localReminderInput = (date: Date) =>
  `${dayKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function reminderFromInput(value: string, now = Date.now()): string | null {
  const date = new Date(value);
  // Round-tripping rejects times skipped when clocks move forward.
  return date.getTime() > now && localReminderInput(date) === value ? date.toISOString() : null;
}

/** Same starting time as the iPhone composer, using this browser's local clock. */
export function defaultReminderDate(taskDate: string | null, now = new Date()): Date {
  if (taskDate) {
    const morning = new Date(`${taskDate}T09:00:00`);
    if (morning > now) return morning;
  }
  const soon = new Date(now.getTime() + 60 * 60_000);
  soon.setSeconds(0, 0);
  const remainder = soon.getMinutes() % 15;
  if (remainder) soon.setMinutes(soon.getMinutes() + 15 - remainder);
  return soon;
}

export function formatReminder(at: string, now = new Date()): string {
  const date = new Date(at);
  const day = dayKey(date);
  const today = dayKey(now);
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  if (day === today) return `Today, ${time}`;
  if (day === shiftDay(today, 1)) return `Tomorrow, ${time}`;
  const label = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  }).format(date);
  return `${label}, ${time}`;
}
