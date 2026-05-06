import { getAdjacentDay, getCurrentDate } from "@/hooks/useDate";
import type { SupabaseTask, TaskGroup } from "@/types/supabase";
import type { Task } from "@/types/task";

type PriorityLabel = Task["priority"];
export type SchedulableTaskGroup = Exclude<TaskGroup, "close">;

export const priorityNumberToLabel = (value?: number | null): PriorityLabel => {
  if (value === null || typeof value === "undefined") {
    return undefined;
  }

  if (value <= 0) {
    return undefined;
  }

  if (value === 1) {
    return "low";
  }

  if (value === 2) {
    return "medium";
  }

  return "high";
};

export const priorityLabelToNumber = (value?: PriorityLabel): number => {
  switch (value) {
    case "low":
      return 1;
    case "medium":
      return 2;
    case "high":
      return 3;
    default:
      return 0;
  }
};

export const getDefaultDateForGroup = (
  group: SchedulableTaskGroup,
): string | null => {
  switch (group) {
    case "today":
      return getCurrentDate();
    case "tomorrow":
      return getAdjacentDay(1);
    case "upcoming":
      return null;
    default:
      return null;
  }
};

export const normalizeScheduledDate = (date?: string | null): string | null => {
  if (!date) {
    return null;
  }

  const today = getCurrentDate();
  return date < today ? today : date;
};

export const getTargetGroupForDate = (
  date?: string | null,
): SchedulableTaskGroup => {
  const normalizedDate = normalizeScheduledDate(date);

  if (!normalizedDate) {
    return "upcoming";
  }

  if (normalizedDate <= getCurrentDate()) {
    return "today";
  }

  if (normalizedDate === getAdjacentDay(1)) {
    return "tomorrow";
  }

  return "upcoming";
};

export const getScheduledDateForTask = (
  task: Pick<SupabaseTask, "target_group" | "date">,
): string | null => {
  if (task.date) {
    return task.date;
  }

  return getDefaultDateForGroup(task.target_group as SchedulableTaskGroup);
};

export const formatScheduledDate = (
  scheduledDate?: string | null,
  backlogLabel = "Backlog",
): string => {
  if (!scheduledDate) {
    return backlogLabel;
  }

  const date = new Date(`${scheduledDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return scheduledDate;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
};

export const formatTaskScheduleBadge = (
  task: Pick<SupabaseTask, "target_group" | "date">,
  backlogLabel = "Backlog",
): string => formatScheduledDate(getScheduledDateForTask(task), backlogLabel);

export const isScheduledTaskOverdue = (
  task: Pick<SupabaseTask, "isComplete" | "is_complete" | "target_group" | "date">,
): boolean => {
  if (isTaskCompleted(task as SupabaseTask) || task.target_group !== "today") {
    return false;
  }

  const scheduledDate = getScheduledDateForTask(task);
  return !!scheduledDate && scheduledDate < getCurrentDate();
};

export const shouldAutoMoveTaskToToday = (
  task: Pick<SupabaseTask, "isComplete" | "is_complete" | "target_group" | "date">,
): boolean => {
  if (isTaskCompleted(task as SupabaseTask) || task.target_group !== "tomorrow" || !task.date) {
    return false;
  }

  return task.date <= getCurrentDate();
};

const isTaskCompleted = (task: SupabaseTask): boolean => {
  if (typeof task.isComplete === "boolean") {
    return task.isComplete;
  }

  const snakeValue = (task as { is_complete?: boolean | null }).is_complete;
  return typeof snakeValue === "boolean" ? snakeValue : false;
};

const isTaskOverdue = (task: SupabaseTask): boolean => {
  return isScheduledTaskOverdue(task);
};

const deriveCategory = (task: SupabaseTask): Task["category"] => {
  const today = getCurrentDate();

  if (isTaskCompleted(task)) {
    const completedAt = task.completed_at ?? undefined;
    const completedToday = completedAt
      ? completedAt === today
      : getScheduledDateForTask(task) === today;
    return completedToday ? "today" : "close";
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
