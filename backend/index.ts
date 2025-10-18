import { createClient } from "@supabase/supabase-js";
import { getCurrentDate } from "../hooks/useDate";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. Check your environment variables.");
}

if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Check your environment variables.");
}

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const fetchTodaysTasks = async () => {
  const user = await supabaseClient.auth.user();
  let tasks = [];

  try {
    await supabaseClient
      .from("tasks")
      .select("*")
      .eq("user_id", user?.id)
      .eq('target_group', 'today')
      .order("priority", { ascending: true })
      .then(({ data, error }) => {
        error && console.log("Error when fetch tasks", error);
        tasks = data;
      });
  } catch (error) {
    console.log("Error when fetch tasks", error);
  }

  return tasks;
};

export const fetchTomorrowsTasks = async () => {
  const user = await supabaseClient.auth.user();
  let tasks = [];

  try {
    await supabaseClient
      .from("tasks")
      .select("*")
      .eq("user_id", user?.id)
      .eq('target_group', 'tomorrow')
      .order("priority", { ascending: true })
      .then(({ data, error }) => {
        error && console.log("Error when fetch tasks", error);
        tasks = data;
      });
  } catch (error) {
    console.log("Error when fetch tasks", error);
  }

  return tasks;
};

export const fetchUpcomingTasks = async () => {
  const user = await supabaseClient.auth.user();
  let tasks = [];

  try {
    await supabaseClient
      .from("tasks")
      .select("*")
      .eq("user_id", user?.id)
      .eq('target_group', 'upcoming')
      .order("priority", { ascending: true })
      .then(({ data, error }) => {
        error && console.log("Error when fetch tasks", error);
        tasks = data;
      });
  } catch (error) {
    console.log("Error when fetch tasks", error);
  }

  return tasks;
};

export const fetchClosedTasks = async () => {
  const user = await supabaseClient.auth.user();
  let tasks = [];

  try {
    await supabaseClient
      .from("tasks")
      .select("*")
      .eq("user_id", user?.id)
      .eq('target_group', 'close')
      .order("priority", { ascending: true })
      .then(({ data, error }) => {
        error && console.log("Error when fetch tasks", error);
        tasks = data;
      });
  } catch (error) {
    console.log("Error when fetch tasks", error);
  }

  return tasks;
};

export const deleteTask = async (taskID) => {
  const { error } = await supabaseClient
    .from("tasks")
    .delete()
    .eq("id", taskID);
  if (error) {
    console.log("Error when delete tasks", error);
  }
};

export const updateTask = async (
  taskID,
  content,
  isComplete,
  priority,
  targetGroup,
  date
) => {
  const user = await supabaseClient.auth.user();

  const { error } = await supabaseClient
    .from("tasks")
    .update({
      content: content,
      isComplete: isComplete,
      user_id: user.id,
      date: date,
      priority: priority,
      target_group: targetGroup,
    })
    .eq("id", taskID);

  if (error) {
    console.log("Error when update tasks", error);
  }
};

export const createTask = async (content, targetGroup) => {
  const user = await supabaseClient.auth.user();
  const currentDate = getCurrentDate();

  const { error } = await supabaseClient.from("tasks").insert([
    {
      content: content,
      isComplete: false,
      user_id: user.id,
      date: currentDate,
      priority: 0,
      target_group: targetGroup,
    },
  ]);
  if (error) {
    console.log("Error when update tasks", error);
  }
};
