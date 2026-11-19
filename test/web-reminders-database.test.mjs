import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createCodexDatabaseFixture, OWNER_A, OWNER_B } from "./helpers/codex-database.mjs";

const SESSION_A = "a1111111-1111-4111-8111-111111111111";
const SESSION_B = "b2222222-2222-4222-8222-222222222222";
const SECOND_SESSION = "c1111111-1111-4111-8111-111111111111";
const DEVICE_A = "a1111111-1111-4111-8111-111111111112";
const DEVICE_B = "b2222222-2222-4222-8222-222222222223";
const ORIGIN = "https://stg.offtasks.com";
const KEY = "B" + "k".repeat(86);
const subscription = (device) => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/fixture-${device}`,
  keys: { p256dh: KEY, auth: "t".repeat(22) },
});

async function setup(t) {
  const fixture = await createCodexDatabaseFixture(t);
  const { db } = fixture;
  await db.exec(`
    reset role;
    alter table auth.users add banned_until timestamptz, add deleted_at timestamptz;
    create table auth.sessions(
      id uuid primary key, user_id uuid references auth.users(id), oauth_client_id uuid, not_after timestamptz
    );
    insert into auth.sessions values
      ('${SESSION_A}', '${OWNER_A}', null, null),
      ('${SESSION_B}', '${OWNER_B}', null, null),
      ('${SECOND_SESSION}', '${OWNER_A}', null, null);
  `);
  await db.exec(await readFile(new URL(
    "../supabase/migrations/20261119000000_offtask_web_reminders.sql", import.meta.url,
  ), "utf8"));
  await db.query("insert into public.offtask_web_reminder_origins values ($1, $2)", [ORIGIN, KEY]);
  const actor = async (user, session, claims = {}) => {
    await fixture.owner(user);
    await db.query("select set_config('request.jwt.claims', $1, false)", [
      JSON.stringify({ session_id: session, ...claims }),
    ]);
  };
  const insertTask = async (user, title) => (await db.query(
    "insert into public.tasks(user_id, content) values ($1, $2) returning id", [user, title],
  )).rows[0].id;
  const reminds = (device, task, { note = "", at = new Date(Date.now() + 86_400_000).toISOString(), push = subscription(device) } = {}) =>
    db.query("select public.offtask_web_reminder_set($1, $2, $3, $4, $5, $6)", [device, ORIGIN, task, note, at, push]);
  const list = async (device) => (await db.query("select * from public.offtask_web_reminder_list($1)", [device])).rows;
  const claim = async (key = KEY) => (await db.query("select * from public.offtask_web_reminder_claim($1)", [key])).rows;
  const finish = (job, expiredEndpoint = null) => db.query(
    "select public.offtask_web_reminder_finish($1, $2, $3)", [job.id, job.lease, expiredEndpoint],
  );
  return { db, actor, insertTask, reminds, list, claim, finish };
}

test("reminders are isolated by account and browser session with no direct browser key access", async (t) => {
  const { db, actor, insertTask, reminds, list, claim } = await setup(t);
  await actor(OWNER_A, SESSION_A);
  const task = await insertTask(OWNER_A, "Plan tomorrow");
  assert.equal((await db.query("select public.offtask_web_reminder_key($1) as key", [ORIGIN])).rows[0].key, KEY);
  assert.equal((await db.query("select public.offtask_web_reminder_key($1) as key", ["https://www.offtasks.com"])).rows[0].key, null);
  const at = new Date(Date.now() + 3_600_000).toISOString();
  await reminds(DEVICE_A, task, { at });
  await reminds(DEVICE_A, task, { at });
  assert.equal((await list(DEVICE_A)).length, 1);
  assert.equal((await list(DEVICE_A))[0].task_id, task);
  assert.deepEqual(Object.keys((await list(DEVICE_A))[0]).sort(), ["note_id", "remind_at", "task_id"]);
  await assert.rejects(claim, /permission denied/);
  await assert.rejects(db.query("select endpoint from public.offtask_web_reminder_devices"), /permission denied/);
  await actor(OWNER_B, SESSION_B);
  assert.deepEqual(await list(DEVICE_A), []);
  await assert.rejects(reminds(DEVICE_B, task), /no longer available/);
  await actor(OWNER_A, SECOND_SESSION);
  assert.deepEqual(await list(DEVICE_A), []);
  await actor(OWNER_A, SESSION_A, { client_id: "oauth-app" });
  await assert.rejects(list(DEVICE_A), /signed-in Offtasks/);
  await actor(OWNER_A, SESSION_B);
  await assert.rejects(list(DEVICE_A), /Sign in again/);
  await db.exec("reset role; set role anon");
  await assert.rejects(list(DEVICE_A), /permission denied/);
});

test("task completion, note changes, and session revocation cancel matching reminders", async (t) => {
  const { db, actor, insertTask, reminds, list } = await setup(t);
  await actor(OWNER_A, SESSION_A);
  const task = await insertTask(OWNER_A, "Complete before reminding");
  await reminds(DEVICE_A, task);
  await db.query('update public.tasks set "isComplete" = true where id = $1', [task]);
  await db.query('update public.tasks set "isComplete" = false where id = $1', [task]);
  assert.deepEqual(await list(DEVICE_A), []);

  const note = {
    id: "note-one", title: "A note", body: "", pinned: false, updatedAt: new Date().toISOString(),
    tasks: [{ id: "pack", content: "Pack a bag", isComplete: false }],
  };
  await db.query("insert into public.planner_items(user_id, kind, id, value) values ($1, 'note', 'note-one', $2)", [OWNER_A, note]);
  await reminds(DEVICE_A, "pack", { note: "note-one" });
  assert.equal((await list(DEVICE_A)).length, 1);
  await db.query("update public.planner_items set value = $1 where id = 'note-one'", [
    { ...note, tasks: [{ ...note.tasks[0], isComplete: true }] },
  ]);
  assert.deepEqual(await list(DEVICE_A), []);
  await reminds(DEVICE_A, task);
  await db.exec("reset role");
  await db.query("delete from auth.sessions where id = $1", [SESSION_A]);
  assert.equal((await db.query("select * from public.offtask_web_reminders")).rows.length, 0);
});

test("due claims are leased once, read the latest task title, and discard work outside the delivery window", async (t) => {
  const { db, actor, insertTask, reminds, claim, finish } = await setup(t);
  await actor(OWNER_A, SESSION_A);
  const task = await insertTask(OWNER_A, "Old task title");
  await reminds(DEVICE_A, task);
  await db.query("update public.tasks set content = 'Renamed task' where id = $1", [task]);
  await db.exec("reset role");
  await db.exec("update public.offtask_web_reminders set remind_at = now() - interval '10 seconds', available_at = now()");
  await db.exec("set role service_role");
  assert.deepEqual(await claim("other key"), []);
  const [job] = await claim();
  assert.equal(job.body, "Renamed task");
  assert.equal(job.device_id, DEVICE_A);
  assert.equal(job.endpoint, subscription(DEVICE_A).endpoint);
  assert.deepEqual(await claim(), []);

  await db.exec("reset role");
  await db.exec("update public.offtask_web_reminders set available_at = now()");
  await db.exec("set role service_role");
  const [retry] = await claim();
  assert.notEqual(retry.lease, job.lease);
  await finish(job);
  await finish(retry);
  await db.exec("reset role");
  assert.deepEqual((await db.query("select id from public.offtask_web_reminders")).rows, []);
  await actor(OWNER_A, SESSION_A);
  await reminds(DEVICE_A, task);
  await db.exec("reset role");
  await db.exec("update public.offtask_web_reminders set remind_at = now() - interval '20 minutes', available_at = now()");
  await db.exec("set role service_role");
  assert.deepEqual(await claim(), []);
  await db.exec("reset role");
  assert.deepEqual((await db.query("select id from public.offtask_web_reminders")).rows, []);
});

test("clearing, disconnecting and app-data cleanup remove only the selected reminders", async (t) => {
  const { db, actor, insertTask, reminds, list } = await setup(t);
  await actor(OWNER_A, SESSION_A);
  const a = await insertTask(OWNER_A, "A reminder");
  await reminds(DEVICE_A, a);
  await reminds(DEVICE_A, a, { at: null, push: null });
  assert.deepEqual(await list(DEVICE_A), []);
  await reminds(DEVICE_A, a);
  await actor(OWNER_B, SESSION_B);
  const b = await insertTask(OWNER_B, "B reminder");
  await reminds(DEVICE_B, b);
  await db.query("select public.offtask_web_reminder_disconnect($1)", [DEVICE_A]);
  await actor(OWNER_A, SESSION_A);
  assert.equal((await list(DEVICE_A)).length, 1);
  // Hosted service_role bypasses RLS, as it does during app-only deletion.
  await db.exec("reset role; alter role service_role bypassrls; set role service_role");
  await db.query("delete from public.offtask_web_reminder_devices where user_id = $1", [OWNER_A]);
  await actor(OWNER_A, SESSION_A);
  assert.deepEqual(await list(DEVICE_A), []);
  await actor(OWNER_B, SESSION_B);
  assert.equal((await list(DEVICE_B)).length, 1);
});
