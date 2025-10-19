import type { SupabaseTask } from "./supabase";

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  overdue: boolean;
  category: "today" | "tomorrow" | "upcoming" | "close";
  completedAt?: number;
  label?: string;
  priority?: "low" | "medium" | "high";
  raw?: SupabaseTask;
}
