import { createClient } from "@supabase/supabase-js";
import { getCurrentDate, useDate } from "../hooks/useDate";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPBASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseClient = createClient(SUPABASE_URL, SUPBASE_ANON_KEY);

export const fetchTasks = async () => {
  const user = await supabaseClient.auth.user();
  let tasks = {};

  try {
    await supabaseClient
      .from("tasks")
      .select("*")
      .eq("user_id", user?.id)
      .order("id", { ascending: false })
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
      priority: null,
      target_group: targetGroup,
    },
  ]);
  if (error) {
    console.log("Error when update tasks", error);
  }
};
