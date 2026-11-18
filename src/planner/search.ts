// One search across tasks, notes and goals, ranked the same way as in the mobile app.
import { dayOf, shortDate, today } from "./dates";
import { goalSummaries, scheduledDay, type Note, type PlannerTask, type TaskGroup } from "./model";

export type SearchResult = { key: string; title: string; subtitle: string } & (
  | { kind: "task"; task: PlannerTask }
  | { kind: "note"; note: Note }
  | { kind: "goal"; goal: string }
);

const fold = (value: string) => value.trim().toLocaleLowerCase();

const groupLabels: Record<TaskGroup, string> = { today: "Today", tomorrow: "Tomorrow", upcoming: "Later", close: "Closed" };

/** When a task is planned for: "Today", "Oct 12" or "Later". */
export function taskWhen(task: PlannerTask) {
  const day = scheduledDay(task);
  return !day ? "Later" : day === today() ? "Today" : shortDate(day);
}

/** Where a task sits, in a few words: its day, then its goal. */
export const taskContext = (task: PlannerTask) =>
  task.label?.trim() ? `${taskWhen(task)} · ${task.label.trim()}` : taskWhen(task);

function taskMatches(task: PlannerTask, needle: string) {
  return [
    task.content,
    task.label ?? "",
    groupLabels[task.target_group],
    task.target_group === "upcoming" ? "later" : "",
    task.isComplete ? "closed complete done" : "open active pending",
    task.date ?? "",
  ].some((part) => part.toLowerCase().includes(needle));
}

export function searchEverything(tasks: PlannerTask[], notes: Note[], goals: string[], query: string): SearchResult[] {
  const needle = fold(query);
  if (!needle) return [];
  const taskResults: SearchResult[] = tasks
    .filter((task) => taskMatches(task, needle))
    .map((task) => ({
      kind: "task",
      key: `task:${task.id}`,
      task,
      title: task.content,
      subtitle: `${taskContext(task)} · ${task.isComplete ? "Completed" : "Open"}`,
    }));
  const noteResults: SearchResult[] = notes
    .filter((note) => fold(`${note.title}\n${note.body}`).includes(needle))
    .map((note) => ({
      kind: "note",
      key: `note:${note.id}`,
      note,
      title: note.title,
      subtitle: `Note${note.pinned ? " · Pinned" : ""} · ${shortDate(dayOf(note.updatedAt))}`,
    }));
  const goalResults: SearchResult[] = goalSummaries(tasks, goals)
    .filter((goal) => fold(goal.name).includes(needle))
    .map((goal) => ({
      kind: "goal",
      key: `goal:${fold(goal.name)}`,
      goal: goal.name,
      title: goal.name,
      subtitle: goal.total ? `Goal · ${goal.completed}/${goal.total} done` : "Goal",
    }));
  const score = (result: SearchResult) => {
    const title = fold(result.title);
    return title === needle ? 0 : title.startsWith(needle) ? 1 : title.includes(needle) ? 2 : 3;
  };
  return [...taskResults, ...noteResults, ...goalResults].sort(
    (a, b) => score(a) - score(b) || a.title.localeCompare(b.title) || a.key.localeCompare(b.key),
  );
}
