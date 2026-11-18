// A stand-in for the Offtasks backend, for local design work and visual checks.
// It keeps sample data in memory and answers the requests the web app makes:
// sign-in, tasks, notes, goals, preferences and the goal/ChatGPT functions.
// Nothing here talks to the real service, and nothing is saved between runs.
//
//   node scripts/sample-backend.mjs            (listens on 127.0.0.1:54399)
//   yarn dev:sample                            (starts it together with the site)
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { sampleAccount, sampleState } from "./sample-data.mjs";

const PORT = Number(process.env.SAMPLE_BACKEND_PORT || 54399);
const state = sampleState();
const sessions = new Map(); // access token -> user id

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const user = () => ({
  id: sampleAccount.id,
  aud: "authenticated",
  role: "authenticated",
  email: sampleAccount.email,
  email_confirmed_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: sampleAccount.name },
  created_at: "2026-01-01T00:00:00Z",
});
function issueSession() {
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub: sampleAccount.id, role: "authenticated", aud: "authenticated", email: sampleAccount.email, exp: now + 3600, iat: now };
  const token = `${base64url({ alg: "none", typ: "JWT" })}.${base64url(claims)}.sample`;
  sessions.set(token, sampleAccount.id);
  return { access_token: token, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: `sample-${randomUUID()}`, user: user() };
}

const send = (response, status, body, headers = {}) => {
  const text = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  response.end(text);
};
const fail = (response, status, message, code) => send(response, status, { message, code, error: message, msg: message });
const readBody = (request) =>
  new Promise((resolve) => {
    let raw = "";
    request.on("data", (chunk) => (raw += chunk));
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });

// --- A small part of the PostgREST query language: eq, in, is, order, limit ---
function matches(row, params, table) {
  for (const [key, raw] of params) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(key)) continue;
    const value = String(raw);
    const cell = row[key];
    if (value.startsWith("eq.")) {
      if (String(cell) !== value.slice(3)) return false;
    } else if (value.startsWith("in.(")) {
      const list = value.slice(4, -1).split(",").map((item) => item.replace(/^"|"$/g, ""));
      if (!list.includes(String(cell))) return false;
    } else if (value.startsWith("is.")) {
      if (value === "is.null" ? cell != null : String(cell) !== value.slice(3)) return false;
    } else if (!table) return false;
  }
  return true;
}
function ordered(rows, params) {
  const order = params.get("order");
  if (!order) return rows;
  const keys = order.split(",").map((part) => {
    const [column, direction] = part.split(".");
    return { column, descending: direction === "desc" };
  });
  return [...rows].sort((left, right) => {
    for (const { column, descending } of keys) {
      const a = left[column] ?? "";
      const b = right[column] ?? "";
      if (a === b) continue;
      return (a < b ? -1 : 1) * (descending ? -1 : 1);
    }
    return 0;
  });
}
function pick(row, select) {
  if (!select || select === "*") return row;
  return Object.fromEntries(select.split(",").map((column) => [column.trim(), row[column.trim()] ?? null]));
}
const tableKeys = { tasks: ["id"], planner_items: ["user_id", "kind", "id"], user_preferences: ["user_id"], contact_messages: ["id"], offtask_goal_logos: ["goal_id"] };

// --- Goals mirror: the real database keeps offtask_goals in step with the planner ---
function ensureGoal(title, deleted = false) {
  const legacy = title.trim().toLocaleLowerCase();
  let goal = state.offtask_goals.find((item) => item.legacy_goal_id === legacy);
  if (!goal) {
    goal = { id: randomUUID(), user_id: sampleAccount.id, legacy_goal_id: legacy, title: title.trim(), outcome: "", priority: 0, status: "active", prd_id: null, prd_acceptance_criteria: [], plan_id: null, revision: 1, updated_at: new Date().toISOString() };
    state.offtask_goals.push(goal);
  }
  goal.title = title.trim();
  goal.status = deleted ? "archived" : "active";
  return goal;
}
function afterWrite(table, row) {
  if (table === "planner_items") {
    row.revision = (row.revision || 0) + 1;
    row.updated_at = new Date().toISOString();
    if (row.kind === "goal" && typeof row.value === "string") ensureGoal(row.value, !!row.deleted);
  }
  if (table === "tasks") {
    row.revision = (row.revision || 0) + 1;
    row.updated_at = new Date().toISOString();
    if (row.label && String(row.label).trim()) {
      const goal = state.offtask_goals.find((item) => item.title.toLocaleLowerCase() === String(row.label).trim().toLocaleLowerCase()) ?? ensureGoal(String(row.label));
      row.goal_id = goal.id;
    } else row.goal_id = null;
  }
}
const goalJson = (goal) => ({ id: goal.id, legacy_goal_id: goal.legacy_goal_id, title: goal.title, outcome: goal.outcome, priority: goal.priority, status: goal.status, revision: String(goal.revision), updated_at: goal.updated_at });
const taskJson = (task) => ({ id: task.id, title: task.content, content: task.content, revision: String(task.revision || 1), isComplete: !!task.isComplete, execution_target: task.execution_target ?? null, work_stage: task.work_stage || "not_started", status: task.isComplete ? "done" : task.work_stage || "not_started", goal_id: task.goal_id ?? null, acceptance_criteria: task.acceptance_criteria || [], source_plan_id: task.source_plan_id ?? null, source_plan_item_id: task.source_plan_item_id ?? null });
const goalTasks = (goal) => state.tasks.filter((task) => task.goal_id === goal.id || (task.label || "").trim().toLocaleLowerCase() === goal.title.toLocaleLowerCase());
function prdJson(goal) {
  const note = state.planner_items.find((item) => item.kind === "note" && item.id === goal.prd_id && !item.deleted);
  return note ? { id: note.id, markdown: note.value.body, acceptance_criteria: goal.prd_acceptance_criteria, revision: String(note.revision || 1) } : null;
}
function planJson(goal) {
  const plan = state.offtask_plans.find((item) => item.id === goal.plan_id);
  if (!plan) return null;
  const prd = prdJson(goal);
  return { id: plan.id, revision: String(plan.revision), source_prd_revision: String(plan.source_prd_revision), source_prd_id: plan.source_prd_id, requirements_changed: !prd || prd.id !== plan.source_prd_id || prd.revision !== String(plan.source_prd_revision), summary: plan.summary, items: plan.items };
}

function rpc(name, body) {
  const { operation, args = {} } = body;
  if (name === "offtask_integration_read") {
    if (operation === "list_goals") {
      const offset = args.offset || 0;
      const limit = args.limit || 20;
      const all = [...state.offtask_goals].sort((a, b) => a.id.localeCompare(b.id));
      return { goals: all.slice(offset, offset + limit).map(goalJson), next_offset: offset + limit < all.length ? offset + limit : null };
    }
    if (operation === "get_goal_context") {
      const goal = state.offtask_goals.find((item) => item.id === args.goal_id);
      if (!goal) throw new Error("not_found");
      return { goal: goalJson(goal), prd: prdJson(goal), plan: planJson(goal), tasks: goalTasks(goal).map(taskJson) };
    }
    if (operation === "get_task_context") {
      const task = state.tasks.find((item) => item.id === args.task_id);
      if (!task) throw new Error("not_found");
      const goal = state.offtask_goals.find((item) => item.id === task.goal_id) ?? null;
      return { task: taskJson(task), goal: goal ? goalJson(goal) : null, recent_updates: state.offtask_task_results.filter((item) => item.task_id === task.id) };
    }
  }
  if (name === "offtask_integration_mutate") {
    if (operation === "save_goal") {
      const title = String(args.title || "").trim();
      if (!title) throw new Error("validation_failed");
      if (args.goal_id) {
        const goal = state.offtask_goals.find((item) => item.id === args.goal_id);
        if (!goal) throw new Error("not_found");
        if (String(goal.revision) !== String(args.expected_revision)) throw new Error("revision_conflict");
        const previous = goal.legacy_goal_id;
        const previousTitle = goal.title;
        goal.title = title;
        goal.legacy_goal_id = title.toLocaleLowerCase();
        goal.outcome = args.outcome ?? goal.outcome;
        goal.revision += 1;
        state.planner_items = state.planner_items.filter((item) => !(item.kind === "goal" && item.id === previous));
        state.planner_items.push({ user_id: sampleAccount.id, kind: "goal", id: goal.legacy_goal_id, value: title, deleted: goal.status === "archived", revision: 1 });
        for (const task of state.tasks) if ((task.label || "").toLocaleLowerCase() === previousTitle.toLocaleLowerCase()) task.label = title;
        return { goal: goalJson(goal) };
      }
      if (state.offtask_goals.some((item) => item.legacy_goal_id === title.toLocaleLowerCase())) throw new Error("revision_conflict: goal already exists");
      state.planner_items.push({ user_id: sampleAccount.id, kind: "goal", id: title.toLocaleLowerCase(), value: title, deleted: false, revision: 1 });
      const goal = ensureGoal(title);
      goal.outcome = args.outcome || "";
      return { goal: goalJson(goal) };
    }
    if (operation === "save_prd") {
      const goal = state.offtask_goals.find((item) => item.id === args.goal_id);
      if (!goal) throw new Error("not_found");
      if (String(goal.revision) !== String(args.expected_goal_revision)) throw new Error("revision_conflict");
      let note = state.planner_items.find((item) => item.kind === "note" && item.id === goal.prd_id && !item.deleted);
      if (note) {
        if (String(note.revision) !== String(args.expected_prd_revision)) throw new Error("revision_conflict");
        note.value = { ...note.value, body: args.markdown, updatedAt: new Date().toISOString() };
        note.revision += 1;
      } else {
        const id = `offtask-prd:${randomUUID()}`;
        note = { user_id: sampleAccount.id, kind: "note", id, value: { id, title: `${goal.title} · PRD`, body: args.markdown, pinned: false, updatedAt: new Date().toISOString() }, deleted: false, revision: 1 };
        state.planner_items.push(note);
        goal.prd_id = id;
      }
      goal.prd_acceptance_criteria = args.acceptance_criteria || [];
      goal.revision += 1;
      return { goal: goalJson(goal), prd: prdJson(goal) };
    }
    if (operation === "update_task") {
      const task = state.tasks.find((item) => item.id === args.task_id);
      if (!task) throw new Error("not_found");
      if (String(task.revision || 1) !== String(args.expected_revision)) throw new Error("revision_conflict");
      Object.assign(task, args.patch || {});
      task.revision = (task.revision || 1) + 1;
      return { task: taskJson(task) };
    }
  }
  if (name === "offtask_set_goal_logo") {
    state.offtask_goal_logos = state.offtask_goal_logos.filter((item) => item.goal_id !== body.goal_id);
    if (body.image_base64) state.offtask_goal_logos.push({ goal_id: body.goal_id, mime_type: body.mime_type, image_base64: body.image_base64 });
    return null;
  }
  if (name === "offtask_chatgpt_status") return state.chatgpt;
  if (name === "offtask_chatgpt_revoke") {
    state.chatgpt = { status: "disconnected", install_url: state.chatgpt.install_url, permissions: [], revision: null };
    return null;
  }
  const error = new Error("Could not find the function");
  error.code = "PGRST202";
  throw error;
}

async function rest(request, response, url) {
  const [, , , table, extra] = url.pathname.split("/");
  const params = url.searchParams;
  if (table === "rpc") {
    try {
      return send(response, 200, rpc(extra, await readBody(request)) ?? null);
    } catch (error) {
      return fail(response, error.code === "PGRST202" ? 404 : 400, error.message, error.code || "P0001");
    }
  }
  const rows = state[table];
  if (!Array.isArray(rows)) return fail(response, 404, `relation "${table}" does not exist`, "42P01");
  const wantsObject = (request.headers.accept || "").includes("vnd.pgrst.object");
  const prefer = request.headers.prefer || "";
  const reply = (list, status = 200) => {
    const shaped = list.map((row) => pick(row, params.get("select")));
    if (wantsObject) return shaped.length === 1 ? send(response, status, shaped[0]) : fail(response, 406, "JSON object requested, multiple (or no) rows returned", "PGRST116");
    return send(response, status, shaped);
  };
  if (request.method === "GET" || request.method === "HEAD") {
    let list = ordered(rows.filter((row) => matches(row, params, table)), params);
    const range = /^(\d+)-(\d+)$/.exec(request.headers.range || "");
    const offset = Number(params.get("offset") || (range ? range[1] : 0));
    const limit = params.get("limit") ? Number(params.get("limit")) : range ? Number(range[2]) - Number(range[1]) + 1 : undefined;
    list = list.slice(offset, limit === undefined ? undefined : offset + limit);
    return reply(list);
  }
  if (request.method === "POST") {
    const body = await readBody(request);
    const incoming = Array.isArray(body) ? body : [body];
    const keys = (params.get("on_conflict") || "").split(",").filter(Boolean);
    const written = [];
    for (const item of incoming) {
      const conflictKeys = keys.length ? keys : tableKeys[table] || ["id"];
      const existing = prefer.includes("resolution=merge-duplicates") ? rows.find((row) => conflictKeys.every((key) => String(row[key]) === String(item[key]))) : undefined;
      if (existing) {
        Object.assign(existing, item);
        afterWrite(table, existing);
        written.push(existing);
      } else {
        const row = { ...(table === "tasks" ? { id: randomUUID(), inserted_at: new Date().toISOString(), isComplete: false, priority: 0, label: null, completed_at: null, work_stage: "not_started", execution_target: null, acceptance_criteria: [] } : {}), ...(table === "planner_items" ? { deleted: false } : {}), ...item };
        afterWrite(table, row);
        rows.push(row);
        written.push(row);
      }
    }
    return prefer.includes("return=representation") ? reply(written, 201) : send(response, 201);
  }
  if (request.method === "PATCH") {
    const body = await readBody(request);
    const targets = rows.filter((row) => matches(row, params, table));
    for (const row of targets) {
      Object.assign(row, body);
      afterWrite(table, row);
    }
    return prefer.includes("return=representation") ? reply(targets) : send(response, 204);
  }
  if (request.method === "DELETE") {
    const targets = rows.filter((row) => matches(row, params, table));
    state[table] = rows.filter((row) => !targets.includes(row));
    return prefer.includes("return=representation") ? reply(targets) : send(response, 204);
  }
  return fail(response, 405, "Method not allowed");
}

async function auth(request, response, url) {
  const path = url.pathname.replace("/auth/v1", "");
  if (path === "/token") {
    const body = await readBody(request);
    if (url.searchParams.get("grant_type") === "password") {
      if (String(body.email).toLowerCase() !== sampleAccount.email || body.password !== sampleAccount.password) return send(response, 400, { error: "invalid_grant", error_description: "Invalid login credentials", msg: "Invalid login credentials", code: 400 });
      return send(response, 200, issueSession());
    }
    return send(response, 200, issueSession());
  }
  if (path === "/user") {
    const token = (request.headers.authorization || "").replace(/^Bearer /, "");
    return sessions.has(token) ? send(response, 200, user()) : send(response, 401, { msg: "Invalid token", code: 401 });
  }
  if (path === "/logout") return send(response, 204);
  if (path === "/signup") return send(response, 200, { ...user(), email: (await readBody(request)).email, identities: [{}], confirmation_sent_at: new Date().toISOString() });
  if (path === "/recover") return send(response, 200, {});
  return fail(response, 404, "Not found");
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  response.setHeader("access-control-allow-origin", request.headers.origin || "*");
  response.setHeader("access-control-allow-headers", request.headers["access-control-request-headers"] || "*");
  response.setHeader("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS,HEAD");
  response.setHeader("access-control-expose-headers", "content-range");
  if (request.method === "OPTIONS") return send(response, 204);
  try {
    if (url.pathname.startsWith("/auth/v1/")) return await auth(request, response, url);
    if (url.pathname.startsWith("/rest/v1/")) return await rest(request, response, url);
    if (url.pathname === "/functions/v1/delete-account") return send(response, 200, { deleted: "app-data", identityRetained: true, signedOutScope: "client-local" });
    // Design helper: start over with the sample content, or with an empty account.
    if (url.pathname === "/__sample/reset" && request.method === "POST") {
      const fresh = sampleState();
      if ((await readBody(request)).empty) Object.assign(fresh, { tasks: [], planner_items: [], offtask_goals: [], offtask_plans: [], offtask_task_results: [] });
      for (const key of Object.keys(state)) delete state[key];
      Object.assign(state, fresh);
      return send(response, 200, { reset: true });
    }
    return fail(response, 404, "Not found");
  } catch (error) {
    return fail(response, 500, error instanceof Error ? error.message : "Sample backend error");
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, "127.0.0.1", () => console.log(`Offtasks sample backend ready on http://127.0.0.1:${PORT}`));
}
export { server };
