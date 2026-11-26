import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createCodexDatabaseFixture,
  OWNER_A as A,
  OWNER_B as B,
} from "./helpers/codex-database.mjs";

test("assistant-created tasks default to Later, are owner-bound and retry safely", async (t) => {
  const f = await createCodexDatabaseFixture(t);
  await f.db.exec("reset role");
  await f.db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261028030000_chatgpt_create_task.sql",
        import.meta.url
      ),
      "utf8"
    )
  );
  await f.owner(B);
  const foreign = (await f.mutate("save_goal", { title: "Another account" }))
    .goal;
  await f.owner(A);
  const own = (await f.mutate("save_goal", { title: "My goal" })).goal;
  const call = async (args, actor = A) =>
    (
      await f.db.query(
        "select public.offtask_integration_create_task($1::jsonb,$2) result",
        [JSON.stringify(args), actor]
      )
    ).rows[0].result;
  await assert.rejects(
    () => call({ content: "Unauthorized", request_key: "blocked-request" }),
    { code: "42501" }
  );
  await f.owner("", "service_role");
  const request = { content: "Plan a trip", request_key: "create-task-retry" };
  const first = await call(request);
  assert.equal(first.task.date, null);
  assert.equal(first.task.target_group, "upcoming");
  assert.equal(first.task.isComplete, false);
  assert.deepEqual(await call(request), first);
  await assert.rejects(
    () => call({ ...request, content: "Changed" }),
    /request_key_conflict/
  );
  const scheduled = await call({
    content: "Book tickets",
    date: "2026-11-24",
    goal_id: own.id,
    request_key: "create-task-date",
  });
  assert.equal(scheduled.task.date, "2026-11-24");
  assert.equal(scheduled.task.goal_id, own.id);
  assert.equal(scheduled.task.label, "My goal");
  const start = await f.mutate("update_task", {
    task_id: scheduled.task.id,
    expected_revision: scheduled.task.revision,
    patch: { work_stage: "in_progress" },
    request_key: "offtasks-web-test-start",
  }, A);
  assert.equal(start.task.work_stage, "in_progress");
  await assert.rejects(
    () =>
      call({
        content: "Not mine",
        goal_id: foreign.id,
        request_key: "foreign-goal-test",
      }),
    /not_found/
  );
  await assert.rejects(
    () =>
      call({
        content: "Invalid date",
        date: "2026-02-30",
        request_key: "invalid-date-test",
      }),
    /validation_failed/
  );
  await f.owner(A);
  const ownTasks = await f.read("list_tasks", {});
  assert.equal(ownTasks.tasks.length, 2);
  const receipt = (await f.db.query("select operation,target,request_key from public.offtask_integration_audit where target=$1 order by operation", [scheduled.task.id])).rows;
  assert.deepEqual(receipt, [
    { operation: "create_task", target: scheduled.task.id, request_key: "create-task-date" },
    { operation: "update_task", target: scheduled.task.id, request_key: "offtasks-web-test-start" },
  ]);
  await f.owner(B);
  assert.equal((await f.read("list_tasks", {})).tasks.length, 0);
  assert.deepEqual((await f.db.query("select target from public.offtask_integration_audit where target=$1", [scheduled.task.id])).rows, []);
});
