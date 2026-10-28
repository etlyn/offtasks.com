/** Shared domain contract for signed-in Offtasks clients. No execution is started here. */
export interface FeatureGoal {
  id: string;
  legacy_goal_id: string;
  title: string;
  outcome: string;
  priority: number;
  status: "active" | "archived";
  revision: string;
  updated_at?: string;
}
export interface GoalPrd {
  id: string;
  markdown: string;
  acceptance_criteria: string[];
  revision: string;
}
export interface GoalPlan {
  id: string;
  revision: string;
  source_prd_revision: string;
  source_prd_id?: string;
  requirements_changed?: boolean;
  summary: string;
  items: Array<{ id: string; title: string; description?: string }>;
}
export interface FeatureTask {
  id: string;
  title: string;
  content: string;
  revision: string;
  isComplete: boolean;
  execution_target: "codex" | null;
  work_stage: string;
  status: string;
  goal_id: string | null;
  acceptance_criteria: string[];
  source_plan_id?: string | null;
  source_plan_item_id?: string | null;
}
export interface WorkUpdate {
  id: string;
  summary: string;
  blockers: string[];
  validation: string[];
  links: Array<{ url: string; label?: string }>;
  created_at: string;
}
export interface GoalContext {
  goal: FeatureGoal;
  prd: GoalPrd | null;
  plan: GoalPlan | null;
  tasks: FeatureTask[];
}
export interface TaskContext {
  task: FeatureTask;
  goal: FeatureGoal | null;
  recent_updates: WorkUpdate[];
}
export type IntegrationTransport = (
  mode: "read" | "mutate",
  operation: string,
  args: Record<string, unknown>,
) => Promise<unknown>;

export const goalRoute = (goalId?: string | null, taskId?: string | null) => {
  const params = new URLSearchParams({ view: "goals" });
  if (goalId) params.set("goal", goalId);
  if (taskId) params.set("task", taskId);
  return `/app?${params}`;
};
/** Only first-party planner selectors or the provider's opaque consent request ID. */
export function safePlannerReturn(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return "/app";
  try {
    const url = new URL(value, "https://offtasks.invalid");
    if (url.origin !== "https://offtasks.invalid") return "/app";
    const params = new URLSearchParams();
    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (url.pathname === "/oauth/consent") {
      const ids = url.searchParams.getAll("authorization_id");
      return ids.length === 1 && /^[A-Za-z0-9]{32}$/.test(ids[0])
        ? `/oauth/consent?${new URLSearchParams({ authorization_id: ids[0] })}`
        : "/app";
    }
    if (url.pathname !== "/app") return "/app";
    for (const key of ["goal", "task"]) {
      const id = url.searchParams.get(key);
      if (id && uuid.test(id)) params.set(key, id);
    }
    if (url.searchParams.get("view") === "goals" || params.size)
      params.set("view", "goals");
    return params.size ? `/app?${params}` : "/app";
  } catch {
    return "/app";
  }
}
export const authReturnRoute = (
  path: "/login" | "/signup" | "/forgot-password",
  next: string,
) => `${path}?${new URLSearchParams({ next: safePlannerReturn(next) })}`;
export const planIsStale = (context: GoalContext) =>
  !!context.plan &&
  (context.plan.requirements_changed === true ||
    context.plan.source_prd_revision !== context.prd?.revision ||
    (context.plan.source_prd_id !== undefined &&
      context.plan.source_prd_id !== context.prd?.id));
export const taskStageLabel = (task: FeatureTask) =>
  task.isComplete ? "done" : task.work_stage.replace(/_/g, " ");
export const splitCriteria = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
export const integrationRequestKey = () =>
  globalThis.crypto?.randomUUID?.() ??
  `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export function integrationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/revision_conflict|request_key_conflict/.test(message))
    return "Changed elsewhere. Your draft is kept. Refresh the current version before saving again.";
  if (/not_found/.test(message))
    return "This item is no longer available to this account.";
  if (/unauthenticated|forbidden/.test(message))
    return "Sign in again to access your goals.";
  return "Goal sync is unavailable. Your draft is kept. Try again.";
}

export function createGoalIntegration(transport: IntegrationTransport) {
  const read = <Result>(operation: string, args: Record<string, unknown>) =>
    transport("read", operation, args) as Promise<Result>;
  const mutate = <Result>(operation: string, args: Record<string, unknown>) =>
    transport("mutate", operation, args) as Promise<Result>;
  return {
    listGoals: (offset = 0) =>
      read<{ goals: FeatureGoal[]; next_offset: number | null }>("list_goals", {
        limit: 100,
        offset,
      }),
    getGoal: (goalId: string) =>
      read<GoalContext>("get_goal_context", { goal_id: goalId }),
    getTask: (taskId: string) =>
      read<TaskContext>("get_task_context", { task_id: taskId }),
    saveGoal: (
      values: {
        title: string;
        outcome: string;
        goal_id?: string;
        expected_revision?: string;
      },
      requestKey: string,
    ) =>
      mutate<{ goal: FeatureGoal }>("save_goal", {
        ...values,
        request_key: requestKey,
      }),
    savePrd: (
      context: GoalContext,
      markdown: string,
      criteria: string[],
      requestKey: string,
    ) =>
      mutate<{ goal: FeatureGoal; prd: GoalPrd }>("save_prd", {
        goal_id: context.goal.id,
        expected_goal_revision: context.goal.revision,
        expected_prd_revision: context.prd?.revision ?? null,
        markdown,
        acceptance_criteria: criteria,
        request_key: requestKey,
      }),
    setTarget: (
      task: FeatureTask,
      executionTarget: "codex" | null,
      requestKey: string,
    ) =>
      mutate<{ task: FeatureTask }>("update_task", {
        task_id: task.id,
        expected_revision: task.revision,
        patch: { execution_target: executionTarget },
        request_key: requestKey,
      }),
  };
}
