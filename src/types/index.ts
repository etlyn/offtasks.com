import type { Dispatch, SetStateAction } from "react";

export type TaskGroup = "today" | "tomorrow" | "upcoming" | "close";

export interface Task {
  id: string;
  user_id: string;
  content: string;
  isComplete: boolean;
  priority: number;
  target_group: TaskGroup;
  date: string;
  inserted_at?: string;
}

export interface TasksState {
  todayTasks: Task[];
  tomorrowTasks: Task[];
  upcomingTasks: Task[];
  closedTasks: Task[];
  totalTasks: number;
  completedTasks: number;
  refreshTasks: () => Promise<void>;
}

export interface AppStateContextValue {
  appState: TasksState | null;
  setAppState: Dispatch<SetStateAction<TasksState | null>>;
}
