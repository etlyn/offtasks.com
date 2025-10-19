import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { getCurrentDate } from "@/hooks/useDate";
import type { SupabaseTask, TaskGroup } from "@/types/supabase";

const SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL) {
  throw new Error("Missing VITE_PUBLIC_SUPABASE_URL. Check your environment variables.");
}

if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_PUBLIC_SUPABASE_ANON_KEY. Check your environment variables.");
}

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type CompletionColumn = "isComplete" | "is_complete";

const COMPLETION_COLUMNS: CompletionColumn[] = ["isComplete", "is_complete"];

const MISSING_COMPLETED_AT_MESSAGE = "completed_at";
const LABEL_COLUMN = "label";
const MISSING_LABEL_MESSAGE = "label";

const isCompletionColumnError = (message: string | null | undefined): boolean => {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return normalized.includes("iscomplete") || normalized.includes("is_complete");
};

let detectedCompletionColumn: CompletionColumn | null = null;
let hasCompletedAtColumn: boolean | null = null;
let hasLabelColumn: boolean | null = null;

const noteCompletionColumn = (tasks?: SupabaseTask[] | null) => {
  if (detectedCompletionColumn || !tasks) {
    return;
  }

  for (const task of tasks) {
    if (!task) {
      continue;
    }

    if (typeof task.isComplete === "boolean") {
      detectedCompletionColumn = "isComplete";
      return;
    }

    if (typeof (task as { is_complete?: unknown }).is_complete === "boolean") {
      detectedCompletionColumn = "is_complete";
      return;
    }
  }
};

const noteCompletedAtColumn = (tasks?: SupabaseTask[] | null) => {
  if (hasCompletedAtColumn !== null || !tasks) {
    return;
  }

  for (const task of tasks) {
    if (!task) {
      continue;
    }

    if (typeof (task as { completed_at?: unknown }).completed_at !== "undefined") {
      hasCompletedAtColumn = true;
      return;
    }
  }
};

const noteLabelColumn = (tasks?: SupabaseTask[] | null) => {
  if (hasLabelColumn === true || !tasks) {
    return;
  }

  for (const task of tasks) {
    if (!task) {
      continue;
    }

    if (typeof (task as { [LABEL_COLUMN]?: unknown })[LABEL_COLUMN] !== "undefined") {
      hasLabelColumn = true;
      return;
    }
  }
};

const ensureCompletionColumn = async (): Promise<CompletionColumn> => {
  if (detectedCompletionColumn) {
    return detectedCompletionColumn;
  }

  const user = supabaseClient.auth.user();

  if (!user) {
    throw new Error("Cannot determine completion column without an authenticated user.");
  }

  for (const column of COMPLETION_COLUMNS) {
    const { error, data } = await supabaseClient
      .from<Record<string, unknown>>("tasks")
      .select(column)
      .eq("user_id", user.id)
      .limit(1);

    if (!error) {
      detectedCompletionColumn = column;
      if (Array.isArray(data)) {
        noteCompletionColumn(data as unknown as SupabaseTask[]);
        noteCompletedAtColumn(data as unknown as SupabaseTask[]);
        noteLabelColumn(data as unknown as SupabaseTask[]);
      }
      return column;
    }

    if (!isCompletionColumnError(error.message)) {
      throw error;
    }
  }

  detectedCompletionColumn = "is_complete";
  return detectedCompletionColumn;
};

const ensureCompletedAtColumn = async (): Promise<boolean> => {
  if (hasCompletedAtColumn !== null) {
    return hasCompletedAtColumn;
  }

  const user = supabaseClient.auth.user();

  if (!user) {
    hasCompletedAtColumn = false;
    return hasCompletedAtColumn;
  }

  const { data, error } = await supabaseClient
    .from<Record<string, unknown>>("tasks")
    .select("completed_at")
    .eq("user_id", user.id)
    .limit(1);

  if (!error) {
    hasCompletedAtColumn = true;
    if (Array.isArray(data)) {
      noteCompletedAtColumn(data as unknown as SupabaseTask[]);
    }
    return hasCompletedAtColumn;
  }

  const message = error.message?.toLowerCase();
  if (message && message.includes(MISSING_COMPLETED_AT_MESSAGE)) {
    hasCompletedAtColumn = false;
    return hasCompletedAtColumn;
  }

  throw error;
};

const ensureLabelColumn = async (): Promise<boolean> => {
  if (hasLabelColumn !== null) {
    return hasLabelColumn;
  }

  const user = supabaseClient.auth.user();

  if (!user) {
    hasLabelColumn = false;
    return hasLabelColumn;
  }

  const { data, error } = await supabaseClient
    .from<Record<string, unknown>>("tasks")
    .select(LABEL_COLUMN)
    .eq("user_id", user.id)
    .limit(1);

  if (!error) {
    hasLabelColumn = true;
    if (Array.isArray(data)) {
      noteLabelColumn(data as unknown as SupabaseTask[]);
    }
    return hasLabelColumn;
  }

  const message = error.message?.toLowerCase();
  if (message && message.includes(MISSING_LABEL_MESSAGE)) {
    hasLabelColumn = false;
    return hasLabelColumn;
  }

  throw error;
};

const fetchTasksByGroup = async (group: TaskGroup): Promise<SupabaseTask[]> => {
  const user = supabaseClient.auth.user();

  if (!user) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from<SupabaseTask>("tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("target_group", group)
    .order("priority", { ascending: true });

  if (error) {
    console.error("Error fetching tasks", error);
    return [];
  }

  noteCompletionColumn(data);
  noteCompletedAtColumn(data);
  noteLabelColumn(data);
  return data ?? [];
};

export const fetchAllTasks = async (): Promise<SupabaseTask[]> => {
  const user = supabaseClient.auth.user();

  if (!user) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from<SupabaseTask>("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("target_group", { ascending: true })
    .order("priority", { ascending: true });

  if (error) {
    console.error("Error fetching tasks", error);
    return [];
  }

  noteCompletionColumn(data);
  noteCompletedAtColumn(data);
  noteLabelColumn(data);
  return data ?? [];
};

export const fetchTodaysTasks = (): Promise<SupabaseTask[]> => fetchTasksByGroup("today");
export const fetchTomorrowsTasks = (): Promise<SupabaseTask[]> => fetchTasksByGroup("tomorrow");
export const fetchUpcomingTasks = (): Promise<SupabaseTask[]> => fetchTasksByGroup("upcoming");
export const fetchClosedTasks = (): Promise<SupabaseTask[]> => fetchTasksByGroup("close");

export const deleteTask = async (taskID: string): Promise<void> => {
  const user = supabaseClient.auth.user();

  if (!user) {
    throw new Error("Cannot delete task without an authenticated user.");
  }

  const { error } = await supabaseClient
    .from<SupabaseTask>("tasks")
    .delete()
    .eq("id", taskID)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting task", error);
    throw error;
  }
};

interface UpdateTaskInput {
  content?: string;
  isComplete?: boolean;
  priority?: number;
  targetGroup?: TaskGroup;
  date?: string;
  label?: string | null;
  completedAt?: string | null;
}

export const updateTask = async (taskID: string, updates: UpdateTaskInput): Promise<void> => {
  const user = supabaseClient.auth.user();

  if (!user) {
    throw new Error("Cannot update task without an authenticated user.");
  }

  const attemptUpdate = async (completionColumn: CompletionColumn): Promise<void> => {
    const payload: Record<string, unknown> = {
      user_id: user.id,
    };

    if (typeof updates.content === "string") {
      payload.content = updates.content;
    }

    if (typeof updates.isComplete === "boolean") {
      payload[completionColumn] = updates.isComplete;
    }

    if (typeof updates.priority === "number") {
      payload.priority = updates.priority;
    }

    if (updates.targetGroup) {
      payload.target_group = updates.targetGroup;
    }

    if (typeof updates.date === "string") {
      payload.date = updates.date;
    }

    if (typeof updates.label !== "undefined") {
      if (await ensureLabelColumn()) {
        payload.label = updates.label;
      }
    }

    if (typeof updates.completedAt !== "undefined") {
      if (await ensureCompletedAtColumn()) {
        payload.completed_at = updates.completedAt;
      }
    }

    const { error } = await supabaseClient
      .from<SupabaseTask>("tasks")
      .update(payload)
      .eq("id", taskID)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating task", error);
      if (error.message?.toLowerCase().includes(MISSING_COMPLETED_AT_MESSAGE)) {
        hasCompletedAtColumn = false;
      }
      if (error.message?.toLowerCase().includes(MISSING_LABEL_MESSAGE)) {
        hasLabelColumn = false;
      }
      throw error;
    }
  };

  const performUpdate = async (retry = false): Promise<void> => {
    const completionColumn = await ensureCompletionColumn();

    try {
      await attemptUpdate(completionColumn);
    } catch (error) {
      if (
        !retry &&
        typeof error === "object" &&
        error !== null &&
        isCompletionColumnError((error as PostgrestError).message)
      ) {
        detectedCompletionColumn = completionColumn === "isComplete" ? "is_complete" : "isComplete";
        await performUpdate(true);
        return;
      }

      throw error;
    }
  };

  await performUpdate();
};

interface CreateTaskInput {
  content: string;
  targetGroup: TaskGroup;
  priority?: number;
  date?: string;
  label?: string | null;
}

export const createTask = async ({
  content,
  targetGroup,
  priority = 0,
  date,
  label,
}: CreateTaskInput): Promise<void> => {
  const user = supabaseClient.auth.user();

  if (!user) {
    throw new Error("Cannot create task without an authenticated user.");
  }

  const taskDate = date ?? getCurrentDate();

  const attemptCreate = async (completionColumn: CompletionColumn): Promise<void> => {
    const payload: Record<string, unknown> = {
      content,
      user_id: user.id,
      date: taskDate,
      priority,
      target_group: targetGroup,
      [completionColumn]: false,
    };

    if (typeof label !== "undefined") {
      if (await ensureLabelColumn()) {
        payload.label = label;
      }
    }

    const { error } = await supabaseClient.from<SupabaseTask>("tasks").insert([payload]);

    if (error) {
      console.error("Error creating task", error);
      if (error.message?.toLowerCase().includes(MISSING_COMPLETED_AT_MESSAGE)) {
        hasCompletedAtColumn = false;
      }
      if (error.message?.toLowerCase().includes(MISSING_LABEL_MESSAGE)) {
        hasLabelColumn = false;
      }
      throw error;
    }
  };

  const performCreate = async (retry = false): Promise<void> => {
    const completionColumn = await ensureCompletionColumn();

    try {
      await attemptCreate(completionColumn);
    } catch (error) {
      if (
        !retry &&
        typeof error === "object" &&
        error !== null &&
        isCompletionColumnError((error as PostgrestError).message)
      ) {
        detectedCompletionColumn = completionColumn === "isComplete" ? "is_complete" : "isComplete";
        await performCreate(true);
        return;
      }

      throw error;
    }
  };

  await performCreate();
};
