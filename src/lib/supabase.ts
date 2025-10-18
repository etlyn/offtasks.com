import { createClient } from "@supabase/supabase-js";
import { getCurrentDate } from "@/hooks/useDate";
import type { Task, TaskGroup } from "@/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. Check your environment variables.");
}

if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Check your environment variables.");
}

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const fetchTasksByGroup = async (group: TaskGroup): Promise<Task[]> => {
  const user = supabaseClient.auth.user();

  if (!user) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from<Task>("tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("target_group", group)
    .order("priority", { ascending: true });

  if (error) {
    console.error("Error fetching tasks", error);
    return [];
  }

  return data ?? [];
};

export const fetchTodaysTasks = (): Promise<Task[]> => fetchTasksByGroup("today");
export const fetchTomorrowsTasks = (): Promise<Task[]> => fetchTasksByGroup("tomorrow");
export const fetchUpcomingTasks = (): Promise<Task[]> => fetchTasksByGroup("upcoming");
export const fetchClosedTasks = (): Promise<Task[]> => fetchTasksByGroup("close");

export const deleteTask = async (taskID: string): Promise<void> => {
  const { error } = await supabaseClient
    .from<Task>("tasks")
    .delete()
    .eq("id", taskID);

  if (error) {
    console.error("Error deleting task", error);
  }
};

export const updateTask = async (
  taskID: string,
  content: string,
  isComplete: boolean,
  priority: number,
  targetGroup: TaskGroup,
  date: string
): Promise<void> => {
  const user = supabaseClient.auth.user();

  if (!user) {
    throw new Error("Cannot update task without an authenticated user.");
  }

  const { error } = await supabaseClient
    .from<Task>("tasks")
    .update({
      content,
      isComplete,
      user_id: user.id,
      date,
      priority,
      target_group: targetGroup,
    })
    .eq("id", taskID);

  if (error) {
    console.error("Error updating task", error);
  }
};

export const createTask = async (
  content: string,
  targetGroup: TaskGroup
): Promise<void> => {
  const user = supabaseClient.auth.user();

  if (!user) {
    throw new Error("Cannot create task without an authenticated user.");
  }

  const currentDate = getCurrentDate();

  const { error } = await supabaseClient.from<Task>("tasks").insert([
    {
      content,
      isComplete: false,
      user_id: user.id,
      date: currentDate,
      priority: 0,
      target_group: targetGroup,
    },
  ]);

  if (error) {
    console.error("Error creating task", error);
  }
};
