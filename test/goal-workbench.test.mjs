import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createGoalIntegration,
  goalRoute,
  integrationError,
  planIsStale,
  splitCriteria,
  taskStageLabel,
  safePlannerReturn,
  authReturnRoute,
} from "../src/lib/goalWorkbench.ts";

const goal = {
  id: "goal-a",
  legacy_goal_id: "work",
  title: "Work",
  outcome: "Useful outcome",
  revision: "7",
  status: "active",
  priority: 0,
};
const context = { goal, prd: null, plan: null, tasks: [] };

test("goal and task routes use the implemented planner query selectors safely", () => {
  assert.equal(
    goalRoute("goal-a", "task-b"),
    "/app?view=goals&goal=goal-a&task=task-b",
  );
  assert.equal(
    new URL(goalRoute("one & two"), "https://offtasks.com").searchParams.get(
      "goal",
    ),
    "one & two",
  );
  assert.equal(goalRoute(), "/app?view=goals");
});

test("sign-in return paths preserve only internal UUID planner selectors, not credentials or open redirects", () => {
  const id = "22222222-2222-4222-8222-222222222222";
  const next = safePlannerReturn(
    `/app?goal=${id}&access_token=secret&code=private#refresh_token=secret`,
  );
  assert.equal(next, `/app?goal=${id}&view=goals`);
  assert.equal(
    new URL(
      authReturnRoute("/login", next),
      "https://offtasks.test",
    ).searchParams.get("next"),
    next,
  );
  for (const value of [
    "https://evil.test",
    "//evil.test/app",
    "/\\evil.test/app",
    "javascript:alert(1)",
    "/support",
    "/app?goal=bad&next=https://evil.test",
    null,
  ])
    assert.equal(safePlannerReturn(value), "/app");
});

test("read operations use real record selectors and explicit bounded pagination", async () => {
  const calls = [];
  const api = createGoalIntegration(async (...args) => {
    calls.push(args);
    return {};
  });
  await api.listGoals(100);
  await api.getGoal("goal-a");
  await api.getTask("task-b");
  assert.deepEqual(calls, [
    ["read", "list_goals", { limit: 100, offset: 100 }],
    ["read", "get_goal_context", { goal_id: "goal-a" }],
    ["read", "get_task_context", { task_id: "task-b" }],
  ]);
});

test("a new PRD carries the current goal revision and explicit null document revision", async () => {
  const calls = [];
  const api = createGoalIntegration(async (...args) => {
    calls.push(args);
    return { goal };
  });
  await api.savePrd(context, "Requirements", ["It works"], "same-retry-key");
  assert.deepEqual(calls[0], [
    "mutate",
    "save_prd",
    {
      goal_id: "goal-a",
      expected_goal_revision: "7",
      expected_prd_revision: null,
      markdown: "Requirements",
      acceptance_criteria: ["It works"],
      request_key: "same-retry-key",
    },
  ]);
  assert.equal("actor" in calls[0][2], false);
});

test("PRD edits check both revisions and preserve the supplied retry key", async () => {
  const calls = [];
  const api = createGoalIntegration(async (...args) => {
    calls.push(args);
    return {};
  });
  const withPrd = {
    ...context,
    prd: {
      id: "prd-a",
      revision: "4",
      markdown: "Before",
      acceptance_criteria: [],
    },
  };
  await api.savePrd(withPrd, "After", [], "retry-a");
  await api.savePrd(withPrd, "After", [], "retry-a");
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0][2].expected_prd_revision, "4");
  assert.equal(calls[0][2].expected_goal_revision, "7");
});

test("Codex intent is an allowlisted revision-checked patch, not an execution or completion", async () => {
  const task = Object.freeze({
    id: "task-a",
    revision: "8",
    isComplete: false,
    execution_target: null,
    work_stage: "ready",
  });
  const calls = [];
  const api = createGoalIntegration(async (...args) => {
    calls.push(args);
    return {};
  });
  await api.setTarget(task, "codex", "intent-key");
  assert.deepEqual(calls[0], [
    "mutate",
    "update_task",
    {
      task_id: "task-a",
      expected_revision: "8",
      patch: { execution_target: "codex" },
      request_key: "intent-key",
    },
  ]);
  assert.equal(task.isComplete, false);
  await api.setTarget(task, null, "clear-key");
  assert.deepEqual(calls[1][2].patch, { execution_target: null });
});

test("create and edit goal operations preserve their distinct revision contracts", async () => {
  const calls = [];
  const api = createGoalIntegration(async (...args) => {
    calls.push(args);
    return {};
  });
  await api.saveGoal({ title: "New goal", outcome: "Useful" }, "new-key");
  await api.saveGoal(
    {
      goal_id: goal.id,
      expected_revision: goal.revision,
      title: "Work",
      outcome: "Better",
    },
    "edit-key",
  );
  assert.equal("expected_revision" in calls[0][2], false);
  assert.equal(calls[1][2].expected_revision, "7");
});

test("unavailable or forbidden data does not turn into an invented empty state", async () => {
  const api = createGoalIntegration(async () => {
    throw new Error("unauthenticated");
  });
  await assert.rejects(api.listGoals(), /unauthenticated/);
  assert.match(
    integrationError(new Error("revision_conflict")),
    /draft is kept/,
  );
  assert.match(integrationError(new Error("forbidden")), /Sign in/);
});

test("plan freshness compares document revisions and completion keeps its existing meaning", () => {
  const plan = {
    id: "plan-a",
    revision: "2",
    source_prd_revision: "3",
    summary: "",
    items: [],
  };
  assert.equal(planIsStale({ ...context, plan }), true);
  assert.equal(
    planIsStale({ ...context, plan, prd: { id: "prd-a", revision: "3" } }),
    false,
  );
  assert.equal(
    taskStageLabel({ isComplete: true, work_stage: "awaiting_review" }),
    "done",
  );
  assert.equal(
    taskStageLabel({ isComplete: false, work_stage: "awaiting_review" }),
    "awaiting review",
  );
  assert.deepEqual(splitCriteria(" One outcome \n\n Another outcome\n"), [
    "One outcome",
    "Another outcome",
  ]);
});

test("same-revision PRD replacement, removal and server freshness flags invalidate a plan", () => {
  const plan = {
    id: "plan-a",
    revision: "1",
    source_prd_id: "prd-original",
    source_prd_revision: "3",
    summary: "",
    items: [],
  };
  const original = {
    id: "prd-original",
    revision: "3",
    markdown: "Requirements",
    acceptance_criteria: [],
  };
  assert.equal(planIsStale({ ...context, plan, prd: original }), false);
  assert.equal(
    planIsStale({
      ...context,
      plan,
      prd: { ...original, id: "prd-replacement" },
    }),
    true,
  );
  assert.equal(planIsStale({ ...context, plan, prd: null }), true);
  assert.equal(
    planIsStale({
      ...context,
      plan: { ...plan, requirements_changed: true },
      prd: original,
    }),
    true,
  );
});

test("client wiring preserves account boundaries, escaped content, draft continuity and actual deep links", async () => {
  const component = await readFile(
    new URL("../src/components/GoalsWorkbench.tsx", import.meta.url),
    "utf8",
  );
  const dashboard = await readFile(
    new URL("../src/screens/Dashboard.tsx", import.meta.url),
    "utf8",
  );
  const transport = await readFile(
    new URL("../src/lib/goalIntegration.ts", import.meta.url),
    "utf8",
  );
  assert.match(dashboard, /GoalsWorkbench\s+key=\{user\.id\}/);
  assert.match(
    dashboard,
    /searchParams\.has\("goal"\)[\s\S]*searchParams\.has\("task"\)/,
  );
  assert.match(dashboard, /hidden=\{!goalsView\}/);
  assert.match(component, /drafts\.current\.get\(goalId\)/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML|innerHTML\s*=/);
  assert.doesNotMatch(transport, /\{\s*operation,\s*args,\s*actor/);
});
