// Reads and writes for the signed-in planner. Every call is scoped to the
// signed-in account by the database; the user id is sent only where a column needs it.
import { supabaseClient } from "@/lib/supabase";
import type { ChatGPTReceipt } from "./chatgptHandoff";
import { readNote, readTask, isBriefId, type Note, type PlannerTask, type TaskChanges, type TaskGroup } from "./model";

const TIMEOUT_MS = 15_000;

async function bounded<Result>(request: (signal: AbortSignal) => PromiseLike<Result>): Promise<Result> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await request(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

// People see plain words; the server's own message goes to the console for whoever is debugging.
const check = (error: { message?: string } | null, plain: string) => {
  if (!error) return;
  console.error(plain, error);
  throw new Error(plain);
};

// ---------- Tasks ----------

export async function fetchTasks(owner: string): Promise<PlannerTask[]> {
  const { data, error } = await bounded((signal) =>
    supabaseClient.from("tasks").select("*").eq("user_id", owner).order("priority", { ascending: true }).abortSignal(signal),
  );
  check(error, "Your tasks could not be loaded. Check your connection and try again.");
  return (data ?? []).map((row) => readTask(row as Record<string, unknown>)).filter((task): task is PlannerTask => !!task);
}

/** The dedicated integration create operation records provenance under the owner's RLS policy. */
export async function fetchAICreatedTaskIds(owner: string): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bounded((signal) => supabaseClient
      .from("offtask_integration_audit")
      .select("target")
      .eq("user_id", owner)
      .eq("operation", "create_task")
      .order("id")
      .range(offset, offset + 999)
      .abortSignal(signal));
    if (error) throw new Error("Task origins could not be read.");
    for (const row of data ?? []) if (typeof row.target === "string") ids.add(row.target);
    if (!data || data.length < 1000) return ids;
  }
}

/** Read only the receipts for requests the owner prepared in this browser. */
export async function fetchChatGPTReceipts(owner: string, keys: string[]): Promise<ChatGPTReceipt[]> {
  const receipts: ChatGPTReceipt[] = [];
  for (let offset = 0; offset < keys.length; offset += 40) {
    const { data, error } = await bounded((signal) => supabaseClient
      .from("offtask_integration_audit")
      .select("operation,target,request_key")
      .eq("user_id", owner)
      .in("request_key", keys.slice(offset, offset + 40))
      .abortSignal(signal));
    if (error) throw new Error("ChatGPT updates could not be read.");
    receipts.push(...(data ?? []));
  }
  return receipts;
}

export async function createTask(
  owner: string,
  values: { content: string; target_group: TaskGroup; date: string | null; priority: number; label: string | null },
) {
  const { data, error } = await bounded((signal) =>
    supabaseClient
      .from("tasks")
      .insert([{ ...values, user_id: owner, isComplete: false }])
      .select("id")
      .abortSignal(signal)
      .single<{ id: string }>(),
  );
  check(error, "The task was not saved. Please try again.");
  return data!.id;
}

export async function updateTask(owner: string, id: string, changes: TaskChanges) {
  const { error } = await bounded((signal) =>
    supabaseClient.from("tasks").update(changes).eq("id", id).eq("user_id", owner).abortSignal(signal),
  );
  check(error, "The change was not saved. Please try again.");
}

export async function deleteTask(owner: string, id: string) {
  const { error } = await bounded((signal) =>
    supabaseClient.from("tasks").delete().eq("id", id).eq("user_id", owner).abortSignal(signal),
  );
  check(error, "The task was not removed. Please try again.");
}

// ---------- Notes and goals (the shared planner collection) ----------

interface PlannerRow {
  id: string;
  value: unknown;
  deleted: boolean;
}

async function fetchPlannerRows(owner: string, kind: "note" | "goal"): Promise<PlannerRow[]> {
  const rows: PlannerRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bounded((signal) =>
      supabaseClient
        .from("planner_items")
        .select("id,value,deleted")
        .eq("user_id", owner)
        .eq("kind", kind)
        .order("id")
        .range(offset, offset + 999)
        .abortSignal(signal),
    );
    check(error, kind === "note" ? "Your notes could not be loaded. Check your connection and try again." : "Your goals could not be loaded. Check your connection and try again.");
    rows.push(...((data ?? []) as PlannerRow[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export async function fetchNotes(owner: string): Promise<Note[]> {
  return (await fetchPlannerRows(owner, "note"))
    .filter((row) => !row.deleted && !isBriefId(row.id))
    .map((row) => readNote(row.id, row.value))
    .filter((note): note is Note => !!note);
}

export async function fetchGoalNames(owner: string): Promise<string[]> {
  return (await fetchPlannerRows(owner, "goal"))
    .filter((row) => !row.deleted && typeof row.value === "string" && row.value.trim())
    .map((row) => row.value as string);
}

async function upsertPlannerItem(owner: string, kind: "note" | "goal", id: string, value: unknown, deleted: boolean) {
  const { error } = await bounded((signal) =>
    supabaseClient
      .from("planner_items")
      .upsert([{ user_id: owner, kind, id, value, deleted }], { onConflict: "user_id,kind,id" })
      .abortSignal(signal),
  );
  check(error, kind === "note" ? "The note was not saved. Please try again." : "The goal was not saved. Please try again.");
}

export function saveNote(owner: string, note: Note) {
  if (isBriefId(note.id)) throw new Error("Edit goal briefs from Goals to keep their revisions.");
  return upsertPlannerItem(owner, "note", note.id, note, false);
}

/** Notes are removed the way the mobile app removes them: kept as a deleted row. */
export const removeNote = (owner: string, note: Note) => upsertPlannerItem(owner, "note", note.id, note, true);

export const removeGoal = (owner: string, name: string) =>
  upsertPlannerItem(owner, "goal", name.trim().toLocaleLowerCase(), name.trim(), true);
