import type { Task, TaskGroup } from "@/types";

export type BoardCategory = TaskGroup;

export interface DashboardTask {
  id: string;
  text: string;
  completed: boolean;
  overdue: boolean;
  priority: "low" | "medium" | "high";
  category: BoardCategory;
  date: string;
  raw: Task;
}
