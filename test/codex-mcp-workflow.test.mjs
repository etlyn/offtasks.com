import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "../integrations/codex/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { InMemoryTransport } from "../integrations/codex/node_modules/@modelcontextprotocol/sdk/dist/esm/inMemory.js";
import { createOfftasksServer } from "../integrations/codex/dist/tools.js";
import { IntegrationBackendError } from "../integrations/codex/dist/contracts.js";
import {
  createCodexDatabaseFixture,
  OWNER_A,
  OWNER_B,
} from "./helpers/codex-database.mjs";

// Actual MCP SDK dispatch and PostgreSQL functions; only the external OAuth and
// PostgREST transports are replaced. This is not hosted/staging acceptance.
test("local MCP → real SQL read/save/apply/result loop is isolated, retry-safe and review-only", async (t) => {
  const f = await createCodexDatabaseFixture(t),
    { goal, prd } = await f.feature();
  await f.owner("", "service_role");
  const adapt = (fn) => async (op, args) => {
    try {
      return await fn(op, args, OWNER_A);
    } catch (e) {
      const code = String(e.message).split(":")[0];
      throw new IntegrationBackendError(code, e.message);
    }
  };
  const server = createOfftasksServer({
    backend: { read: adapt(f.read), mutate: adapt(f.mutate) },
    principal: {
      userId: OWNER_A,
      clientId: "local-fixture",
      sessionId: OWNER_B,
      permissions: ["read", "write"],
    },
    resourceMetadataUrl:
      "https://test.invalid/.well-known/oauth-protected-resource",
    oauthScopes: [],
    cursorSecret: "local-test-only-continuation-key-123456",
  });
  const client = new Client({
      name: "local-workflow-fixture",
      version: "1.0.0",
    }),
    [left, right] = InMemoryTransport.createLinkedPair();
  await server.connect(right);
  await client.connect(left);
  t.after(async () => {
    await client.close();
    await server.close();
  });
  const call = async (name, args) => {
    const result = await client.callTool({ name, arguments: args });
    assert.notEqual(result.isError, true, JSON.stringify(result));
    assert.equal(result.structuredContent.ok, true);
    return result.structuredContent.data;
  };
  const projects = await call("list_projects", {});
  assert.equal(projects.projects[0].id, OWNER_A);
  const goals = await call("list_goals", { project_id: OWNER_A });
  assert.equal(goals.goals[0].id, goal.id);
  const context = await call("get_goal_context", { goal_id: goal.id });
  assert.equal(context.prd.revision, prd.revision);
  assert.equal(context.context_complete, true);
  const planArgs = {
    goal_id: goal.id,
    expected_goal_revision: goal.revision,
    expected_prd_revision: prd.revision,
    expected_plan_revision: null,
    summary: "A real local SQL plan",
    items: [
      {
        id: "build",
        title: "Build the integration",
        acceptance_criteria: ["Tests pass"],
      },
    ],
    request_key: "workflow-plan-request",
  };
  const saved = await call("save_plan", planArgs),
    retry = await call("save_plan", planArgs);
  assert.equal(saved.plan.id, retry.plan.id);
  const apply = {
    plan_id: saved.plan.id,
    expected_plan_revision: saved.plan.revision,
    selected_item_ids: ["build"],
    request_key: "workflow-apply-request",
  };
  const created = await call("apply_plan_tasks", apply);
  assert.deepEqual(await call("apply_plan_tasks", apply), created);
  const taskId = created.created_task_ids[0],
    task = await call("get_task_context", { task_id: taskId });
  assert.equal(task.task.execution_target, "codex");
  await call("update_task", {
    task_id: taskId,
    expected_revision: task.task.revision,
    patch: { work_stage: "awaiting_review" },
    request_key: "workflow-review-request",
  });
  const resultArgs = {
    task_id: taskId,
    source_goal_revision: task.goal.revision,
    source_prd_revision: task.prd.revision,
    summary: "Implemented locally; hosted OAuth untested.",
    validation: ["Local PostgreSQL and MCP checks passed."],
    links: [
      {
        url: "https://github.com/etlyn/offtasks.com",
        label: "Owning repository",
      },
    ],
    request_key: "workflow-result-request",
  };
  await call("add_task_result", resultArgs);
  await call("add_task_result", resultArgs);
  const final = await call("get_task_context", { task_id: taskId });
  assert.equal(final.recent_updates.length, 1);
  assert.equal(final.task.work_stage, "awaiting_review");
  assert.equal(final.task.isComplete, false);
  assert.equal(final.recent_updates[0].links[0].label, "Owning repository");
  await f.owner(OWNER_A);
  const current = await f.read("get_goal_context", { goal_id: goal.id });
  const longRequirements = "Requirement 🟢 stays complete.\n".repeat(2500);
  await f.mutate("save_prd", {
    goal_id: goal.id,
    expected_goal_revision: current.goal.revision,
    expected_prd_revision: current.prd.revision,
    markdown: longRequirements,
    acceptance_criteria: ["Every section remains available."],
    request_key: "workflow-long-prd",
  });
  await f.owner("", "service_role");
  let page = await call("get_task_context", { task_id: taskId });
  assert.equal(page.context_complete, false);
  let serialized = "";
  for (let i = 0; i < 100; i++) {
    serialized += page.context_fragment.text;
    if (!page.next_cursor) break;
    page = await call("get_task_context", {
      task_id: taskId,
      cursor: page.next_cursor,
    });
  }
  const complete = JSON.parse(serialized);
  assert.equal(complete.prd.markdown, longRequirements);
  assert.deepEqual(complete.prd.acceptance_criteria, [
    "Every section remains available.",
  ]);
  const widget = await call("render_plan_widget", {
    project_id: OWNER_A,
    goal_id: goal.id,
    execution_target: "codex",
  });
  assert.equal(widget.prd.markdown, undefined);
  assert.equal(widget.plan.requirements_changed, true);
  assert.equal(widget.tasks[0].source_plan_item_id, "build");
  assert.ok(JSON.stringify(widget).length < 16000);
  const invalid = await client.callTool({
    name: "list_goals",
    arguments: { project_id: OWNER_B },
  });
  assert.equal(invalid.isError, true);
  assert.equal(invalid.structuredContent.error.code, "not_found");
});
