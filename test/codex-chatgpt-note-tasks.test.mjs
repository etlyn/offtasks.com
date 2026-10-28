import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createCodexDatabaseFixture,
  OWNER_A as A,
  OWNER_B as B,
} from "./helpers/codex-database.mjs";

test("task lists include only the owner’s synced note tasks with bounded pagination and filters", async (t) => {
  const f = await createCodexDatabaseFixture(t);
  await f.db.exec("reset role");
  await f.db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261028040000_chatgpt_list_note_tasks.sql",
        import.meta.url
      ),
      "utf8"
    )
  );
  await f.owner(A);
  await f.db.query(
    "insert into public.tasks(user_id,content,target_group) values($1,$2,$3)",
    [A, "Ordinary task", "upcoming"]
  );
  const note = {
    id: "note-a",
    title: "Travel",
    body: "",
    pinned: false,
    updatedAt: "2026-10-28T00:00:00.000Z",
    tasks: [
      {
        id: "first",
        content: "Book a flight",
        isComplete: false,
        date: null,
        target_group: "upcoming",
      },
      {
        id: "second",
        content: "Find a hotel",
        isComplete: true,
        date: "2026-11-24",
        target_group: "upcoming",
      },
      { id: "invalid", content: "Bad legacy item", isComplete: "bad" },
    ],
  };
  await f.db.query(
    "insert into public.planner_items(user_id,kind,id,value) values($1,'note',$2,$3::jsonb)",
    [A, note.id, JSON.stringify(note)]
  );
  await f.owner(B);
  await f.db.query(
    "insert into public.planner_items(user_id,kind,id,value) values($1,'note','other',$2::jsonb)",
    [
      B,
      JSON.stringify({
      id: "other",
      title: "Private",
      body: "",
      pinned: false,
      updatedAt: "2026-10-28T00:00:00.000Z",
        tasks: [{ id: "secret", content: "Other user", isComplete: false }],
      }),
    ]
  );
  const call = async (args = {}, actor = A) =>
    (
      await f.db.query(
        "select public.offtask_integration_list_tasks($1::jsonb,$2) result",
        [JSON.stringify(args), actor]
      )
    ).rows[0].result;
  await assert.rejects(() => call(), { code: "42501" });
  await f.owner("", "service_role");
  const all = await call();
  assert.equal(all.tasks.length, 3);
  assert.equal(
    all.tasks.some((item) => item.content === "Other user"),
    false
  );
  const embedded = all.tasks.find((item) => item.content === "Book a flight");
  assert.match(embedded.id, /^note-task:[a-f0-9]{64}$/);
  assert.equal(embedded.note_title, "Travel");
  assert.equal(embedded.read_only, true);
  assert.equal((await call({ status: "open" })).tasks.length, 2);
  assert.equal(
    (await call({ status: "done" })).tasks[0].content,
    "Find a hotel"
  );
  assert.equal((await call({ include_note_tasks: false })).tasks.length, 1);
  assert.equal((await call({ query: "flight" })).tasks[0].id, embedded.id);
  const first = await call({ limit: 1 });
  const second = await call({ limit: 1, offset: first.next_offset });
  const third = await call({ limit: 1, offset: second.next_offset });
  assert.equal(
    new Set(
      [...first.tasks, ...second.tasks, ...third.tasks].map((item) => item.id)
    ).size,
    3
  );
  assert.equal((await call({}, B)).tasks.length, 1);
  await assert.rejects(() => call({ project_id: B }), /not_found/);
});
