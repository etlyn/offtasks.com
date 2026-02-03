import { getCurrentDate } from "@/hooks/useDate";
import type { SupabaseTask } from "@/types/supabase";
import type { Task } from "@/types/task";

type PriorityLabel = Task["priority"];

export const priorityNumberToLabel = (value?: number | null): PriorityLabel => {
  if (value === null || typeof value === "undefined") {
    return undefined;
  }

  if (value <= 0) {
    return "high";
  }

  if (value === 1) {
    return "medium";
  }

  return "low";
};

export const priorityLabelToNumber = (value?: PriorityLabel): number => {
  switch (value) {
    case "high":
      return 0;
    case "medium":
      return 1;
    case "low":
      return 2;
    default:
      return 2;
  }
};

const isTaskCompleted = (task: SupabaseTask): boolean => {
  if (typeof task.isComplete === "boolean") {
    return task.isComplete;
  }

  const snakeValue = (task as { is_complete?: boolean | null }).is_complete;
  return typeof snakeValue === "boolean" ? snakeValue : false;
};

const isTaskOverdue = (task: SupabaseTask): boolean => {
  if (!task.date || isTaskCompleted(task)) {
    return false;
  }

  const today = getCurrentDate();
  return task.date < today && task.target_group === "today";
};

const deriveCategory = (task: SupabaseTask): Task["category"] => {
  const today = getCurrentDate();

  if (isTaskCompleted(task)) {
    const completedAt = task.completed_at ?? undefined;
    const completedToday = completedAt ? completedAt === today : task.date === today;
    return completedToday ? "today" : "close";
  }

  if (task.date <= today && task.target_group === "today") {
    return "today";
  }

  switch (task.target_group) {
    case "today":
      return "today";
    case "tomorrow":
      return "tomorrow";
    case "upcoming":
      return "upcoming";
    case "close":
      return "close";
    default:
      return "today";
  }
};

const deriveCompletedTimestamp = (task: SupabaseTask): number | undefined => {
  if (!isTaskCompleted(task)) {
    return undefined;
  }

  if (task.completed_at) {
    const parsed = Date.parse(task.completed_at);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  if (task.updated_at) {
    const parsed = Date.parse(task.updated_at);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  if (task.inserted_at) {
    const parsed = Date.parse(task.inserted_at);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
};

export const fromSupabaseTask = (task: SupabaseTask): Task => ({
  id: task.id,
  text: task.content,
  completed: isTaskCompleted(task),
  overdue: isTaskOverdue(task),
  category: deriveCategory(task),
  completedAt: deriveCompletedTimestamp(task),
  label: task.label ?? (task as { category?: string | null }).category ?? undefined,
  priority: priorityNumberToLabel(task.priority),
  raw: task,
});
