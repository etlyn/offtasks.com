export type TaskGroup = "today" | "tomorrow" | "upcoming" | "close";

export interface SupabaseTask {
  id: string;
  user_id: string;
  content: string;
  isComplete?: boolean | null;
  is_complete?: boolean | null;
  priority: number;
  target_group: TaskGroup;
  date: string;
  inserted_at?: string;
  updated_at?: string;
  label?: string | null;
  completed_at?: string | null;
}
