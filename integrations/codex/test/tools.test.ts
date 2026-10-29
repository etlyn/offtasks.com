import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  createOfftasksServer,
  TASKS_WIDGET_URI,
  WIDGET_URI,
} from "../src/tools.js";
import {
  IntegrationBackendError,
  type IntegrationBackend,
  type AppPermission,
} from "../src/contracts.js";

const owner = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222",
  goal = "33333333-3333-4333-8333-333333333333",
  task = "44444444-4444-4444-8444-444444444444";
const object = (v: unknown) => v as Record<string, unknown>;
async function connect(
  t: { after(fn: () => unknown): unknown },
  backend: IntegrationBackend,
  permissions: AppPermission[] = ["read", "write"],
  userId = owner
) {
  const server = createOfftasksServer({
    backend,
    principal: { userId, clientId: "test", sessionId: other, permissions },
    resourceMetadataUrl:
      "https://mcp.example/.well-known/oauth-protected-resource",
    oauthScopes: ["openid"],
    cursorSecret: "test-continuation-signing-key-".repeat(3),
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "local-tool-test", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  t.after(async () => {
    await client.close();
    await server.close();
  });
  return client;
}
const noop: IntegrationBackend = {
  read: async () => ({ projects: [] }),
  mutate: async () => ({}),
};

test("real MCP discovery exposes tools with wire auth policy and the plan and task widgets", async (t) => {
  const client = await connect(t, noop),
    { tools } = await client.listTools();
  assert.equal(tools.length, 12);
  for (const tool of tools) {
    assert.deepEqual(object(tool._meta).securitySchemes, [
      { type: "oauth2", scopes: ["openid"] },
    ]);
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.outputSchema?.type, "object");
    assert.equal(tool.annotations?.openWorldHint, false);
    assert.equal(
      tool.annotations?.destructiveHint,
      ["save_goal", "save_plan", "update_task"].includes(tool.name),
      `${tool.name} must advertise whether it can overwrite existing content`
    );
    if (!["render_plan_widget", "list_tasks"].includes(tool.name))
      assert.equal(object(tool._meta ?? {}).ui, undefined);
  }
  // The standard SDK client strips unknown extension fields in listTools().
  // Inspect the actual wire response with an extension-aware result schema too.
  const wire = await client.request(
    { method: "tools/list" },
    z.object({
      tools: z.array(
        z
          .object({
            securitySchemes: z.array(
              z.object({
                type: z.literal("oauth2"),
                scopes: z.array(z.string()),
              })
            ),
          })
          .passthrough()
      ),
    })
  );
  assert.ok(
    wire.tools.every((tool) => tool.securitySchemes[0]?.scopes[0] === "openid")
  );
  assert.equal(
    object(tools.find((x) => x.name === "render_plan_widget")?._meta?.ui)
      .resourceUri,
    WIDGET_URI
  );
  assert.equal(
    object(tools.find((x) => x.name === "list_tasks")?._meta?.ui).resourceUri,
    TASKS_WIDGET_URI
  );
  const resources = await client.listResources();
  assert.ok(
    resources.resources.some((resource) => resource.uri === TASKS_WIDGET_URI)
  );
  const legacy = await client.readResource({ uri: "ui://offtasks/tasks-v1.html" });
  assert.equal(legacy.contents[0]?.mimeType, "text/html;profile=mcp-app");
});

test("read-only permissions and ambiguous selectors cannot reach writes or leak errors", async (t) => {
  let mutations = 0,
    reads = 0;
  const client = await connect(
    t,
    {
      read: async () => {
        reads++;
        throw new Error("secret-token-and-SQL");
      },
      mutate: async () => {
        mutations++;
        return {};
      },
    },
    ["read"]
  );
  const denied = await client.callTool({
    name: "update_task",
    arguments: {
      task_id: task,
      expected_revision: "1",
      patch: { execution_target: "codex" },
      request_key: "stable-request",
    },
  });
  assert.equal(
    object(object(denied.structuredContent).error).code,
    "forbidden"
  );
  assert.equal(mutations, 0);
  const createDenied = await client.callTool({
    name: "create_task",
    arguments: { content: "Private task", request_key: "create-request" },
  });
  assert.equal(
    object(object(createDenied.structuredContent).error).code,
    "forbidden"
  );
  assert.equal(mutations, 0);
  const ambiguous = await client.callTool({
    name: "list_tasks",
    arguments: { project_id: owner, goal_id: goal },
  });
  assert.equal(
    object(object(ambiguous.structuredContent).error).code,
    "ambiguous_selection"
  );
  assert.equal(reads, 0);
  const failed = await client.callTool({
    name: "list_projects",
    arguments: {},
  });
  assert.equal(
    object(object(failed.structuredContent).error).code,
    "upstream_unavailable"
  );
  assert.ok(!JSON.stringify(failed).includes("secret-token-and-SQL"));
});

test("existing goal writes require the selected goal revision", async (t) => {
  let mutations = 0;
  const client = await connect(t, {
    read: async () => ({}),
    mutate: async () => {
      mutations++;
      return { goal: { id: goal, title: "Goal", revision: "2" } };
    },
  });
  const missingRevision = await client.callTool({
    name: "save_goal",
    arguments: {
      goal_id: goal,
      title: "Goal",
      request_key: "update-goal-request",
    },
  });
  assert.equal(
    object(object(missingRevision.structuredContent).error).code,
    "validation_failed"
  );
  assert.equal(mutations, 0);
  const updated = await client.callTool({
    name: "save_goal",
    arguments: {
      goal_id: goal,
      title: "Goal",
      expected_revision: "1",
      request_key: "update-goal-request",
    },
  });
  assert.equal(object(updated.structuredContent).ok, true);
  assert.equal(mutations, 1);
});

test("a task list without a selector reads account tasks and scheduling preserves revision and retry keys", async (t) => {
  const calls: Array<{ op: string; args: Record<string, unknown> }> = [];
  const client = await connect(t, {
    read: async (op, args) => {
      calls.push({ op, args });
      return {
        tasks: [{ id: task, content: "A current task", revision: "1" }],
        next_offset: 20,
      };
    },
    mutate: async (op, args) => {
      calls.push({ op, args });
      return { task: { id: task, content: "A current task", revision: "2" } };
    },
  });
  const listed = await client.callTool({
    name: "list_tasks",
    arguments: { status: "open" },
  });
  assert.equal(object(listed.structuredContent).ok, true);
  assert.equal(calls[0]?.op, "list_tasks");
  assert.equal(calls[0]?.args.status, "open");
  assert.equal(calls[0]?.args.project_id, undefined);
  assert.equal(calls[0]?.args.goal_id, undefined);
  assert.ok(object(object(listed.structuredContent).data).next_cursor);

  const update = {
    task_id: task,
    expected_revision: "1",
    request_key: "schedule-request-1",
  };
  for (const date of ["2026-11-24", null]) {
    const result = await client.callTool({
      name: "update_task",
      arguments: { ...update, patch: { date } },
    });
    assert.equal(object(result.structuredContent).ok, true);
    assert.deepEqual(object(calls.at(-1)?.args.patch), {
      date,
      target_group: "upcoming",
    });
    assert.equal(calls.at(-1)?.args.expected_revision, "1");
    assert.equal(calls.at(-1)?.args.request_key, "schedule-request-1");
  }
  const before = calls.length;
  const invalid = await client.callTool({
    name: "update_task",
    arguments: { ...update, patch: { date: "2026-02-30" } },
  });
  assert.equal(invalid.isError, true);
  assert.equal(calls.length, before);
});

test("note tasks are returned read-only without a misleading standalone task link", async (t) => {
  const noteId = `note-task:${"a".repeat(64)}`;
  const client = await connect(t, {
    read: async () => ({ tasks: [{ id: noteId, revision: "5", content: "From a note", origin: "note", read_only: true }] }),
    mutate: async () => ({}),
  });
  const result = await client.callTool({ name: "list_tasks", arguments: {} });
  const taskFromNote = object((object(object(result.structuredContent).data).tasks as unknown[])[0]);
  assert.equal(taskFromNote.id, noteId);
  assert.equal(taskFromNote.read_only, true);
  assert.equal(taskFromNote.url, undefined);
});

test("plan widget continuation keeps its standalone-task filter bound to the cursor", async (t) => {
  const reads: Array<Record<string, unknown>> = [];
  const client = await connect(t, {
    read: async (operation, args) => {
      if (operation === "render_plan_widget") return { goal: { id: goal, title: "Goal", revision: "1" } };
      reads.push(args);
      return { tasks: [{ id: task, content: "Task", revision: "1" }], next_offset: 20 };
    },
    mutate: async () => ({}),
  });
  const widget = await client.callTool({ name: "render_plan_widget", arguments: { project_id: owner, goal_id: goal } });
  const cursor = object(object(widget.structuredContent).data).tasks_next_cursor;
  const next = await client.callTool({ name: "list_tasks", arguments: { goal_id: goal, limit: 20, include_note_tasks: false, cursor } });
  assert.equal(object(next.structuredContent).ok, true);
  assert.equal(reads[0]?.include_note_tasks, false);
  assert.equal(reads[1]?.include_note_tasks, false);
});

test("plan drafts keep stable request/revision contracts and never apply or complete tasks", async (t) => {
  const calls: Array<{ op: string; args: Record<string, unknown> }> = [];
  const client = await connect(t, {
    read: async () => ({}),
    mutate: async (op, args) => {
      calls.push({ op, args });
      return { plan: { id: goal, revision: "2" } };
    },
  });
  const input = {
    goal_id: goal,
    expected_goal_revision: "2",
    expected_prd_revision: "3",
    expected_plan_revision: null,
    summary: "Implementation proposal",
    items: [{ id: "stable-step", title: "First task" }],
    request_key: "plan-request-1",
  };
  await client.callTool({ name: "save_plan", arguments: input });
  await client.callTool({ name: "save_plan", arguments: input });
  assert.deepEqual(
    calls.map((c) => c.op),
    ["save_plan", "save_plan"]
  );
  assert.equal(calls[0]?.args.request_key, calls[1]?.args.request_key);
  assert.equal(calls[0]?.args.expected_prd_revision, "3");
  const invalid = await client.callTool({
    name: "save_plan",
    arguments: { ...input, expected_prd_revision: "stale" },
  });
  assert.equal(invalid.isError, true);
  assert.equal(calls.length, 2);
});

test("oversized context continues losslessly, including long criteria, and detects any revision change", async (t) => {
  let revision = "1";
  const full = () => ({
    goal: { id: goal, title: "Feature", revision: "1" },
    task: {
      id: task,
      title: "Task",
      revision,
      acceptance_criteria: ["AC " + "🟢 requirement ".repeat(9000)],
    },
    prd: { id: "document", revision, markdown: "Full requirements" },
    plan: { id: goal, revision: "2" },
  });
  const client = await connect(t, {
    read: async () => full(),
    mutate: async () => ({}),
  });
  const first = object(
      (
        await client.callTool({
          name: "get_task_context",
          arguments: { task_id: task },
        })
      ).structuredContent
    ),
    initial = object(first.data);
  assert.equal(initial.context_complete, false);
  let combined = "",
    page = initial;
  for (let i = 0; i < 100; i++) {
    combined += String(object(page.context_fragment).text);
    if (!page.next_cursor) break;
    page = object(
      object(
        (
          await client.callTool({
            name: "get_task_context",
            arguments: { task_id: task, cursor: page.next_cursor },
          })
        ).structuredContent
      ).data
    );
  }
  assert.deepEqual(
    JSON.parse(combined).task.acceptance_criteria,
    full().task.acceptance_criteria
  );
  revision = "2";
  const stale = await client.callTool({
    name: "get_task_context",
    arguments: { task_id: task, cursor: initial.next_cursor },
  });
  assert.equal(
    object(object(stale.structuredContent).error).code,
    "revision_conflict"
  );
});

test("continuation is signed and bound to owner, selection and filters", async (t) => {
  const backend: IntegrationBackend = {
    read: async () => ({
      goals: [{ id: goal, title: "Current", revision: "1" }],
      next_offset: 20,
    }),
    mutate: async () => ({}),
  };
  const first = await connect(t, backend),
    second = await connect(t, backend, ["read"], other);
  const response = object(
    object(
      (
        await first.callTool({
          name: "list_goals",
          arguments: { project_id: owner },
        })
      ).structuredContent
    ).data
  );
  const cursor = String(response.next_cursor);
  const replay = await second.callTool({
    name: "list_goals",
    arguments: { project_id: owner, cursor },
  });
  assert.equal(
    object(object(replay.structuredContent).error).code,
    "forbidden"
  );
  const tamper = await first.callTool({
    name: "list_goals",
    arguments: { project_id: owner, cursor: cursor.slice(0, -4) + "abcd" },
  });
  assert.equal(
    object(object(tamper.structuredContent).error).code,
    "validation_failed"
  );
  const filter = await first.callTool({
    name: "list_goals",
    arguments: { project_id: owner, cursor, query: "different" },
  });
  assert.equal(
    object(object(filter.structuredContent).error).code,
    "forbidden"
  );
});

test("safe application errors preserve the result schema instead of fabricating empty data", async (t) => {
  const client = await connect(t, {
    read: async () => {
      throw new IntegrationBackendError("not_found", "private row details");
    },
    mutate: async () => ({}),
  });
  const result = await client.callTool({
      name: "get_goal_context",
      arguments: { goal_id: goal },
    }),
    body = object(result.structuredContent);
  assert.equal(result.isError, true);
  assert.equal(body.ok, false);
  assert.equal(object(body.error).code, "not_found");
  assert.equal(body.data, undefined);
  assert.ok(!JSON.stringify(result).includes("private row details"));
});
