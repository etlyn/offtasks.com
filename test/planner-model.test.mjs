import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { writeFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// The planner's rules are plain TypeScript; bundle them once and test them as shipped.
const path = new URL(`../node_modules/.planner-model-${process.pid}.mjs`, import.meta.url);
const bundle = await build({
  stdin: {
    contents: `
      export * from "./src/planner/model.ts";
      export * as dates from "./src/planner/dates.ts";
      export * from "./src/planner/search.ts";
      export { defaultGoalAppearance, surpriseGoalAppearance, goalColors, goalEmoji, goalInitials } from "./src/planner/goalAppearance.ts";
    `,
    resolveDir: fileURLToPath(new URL("..", import.meta.url)),
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
await writeFile(path, bundle.outputFiles[0].text);
const planner = await import(path.href);
test.after(() => unlink(path));

const { dates } = planner;
const today = dates.today();
const task = (values) => ({
  id: "t",
  content: "Task",
  isComplete: false,
  priority: 0,
  target_group: "upcoming",
  date: null,
  label: null,
  completed_at: null,
  ...values,
});

test("Board and Calendar use the same dates, including legacy task groups", () => {
  const future = dates.shiftDay(today, 9);
  const yesterday = dates.shiftDay(today, -1);
  assert.equal(planner.groupForDate(null), "upcoming");
  assert.equal(planner.groupForDate(today), "today");
  assert.equal(planner.groupForDate(yesterday), "today");
  assert.equal(planner.groupForDate(dates.shiftDay(today, 1)), "tomorrow");
  assert.equal(planner.groupForDate(future), "upcoming");

  const tasks = [
    task({ id: "a", date: today, target_group: "today" }),
    task({ id: "b", date: yesterday, target_group: "today" }),
    task({ id: "c", date: null, target_group: "upcoming" }),
    task({ id: "d", date: null, target_group: "today" }),
    task({ id: "e", date: future, target_group: "upcoming" }),
    task({ id: "f", target_group: "tomorrow" }),
    task({ id: "g", date: dates.shiftDay(today, 1), target_group: "upcoming", isComplete: true }),
  ];
  // Past dates are never pulled forward to today.
  assert.deepEqual(planner.tasksForDay(tasks, today).map((item) => item.id), ["a", "d"]);
  assert.deepEqual(planner.tasksForDay(tasks, yesterday).map((item) => item.id), ["b"]);
  const board = planner.boardTasks(tasks, today);
  assert.deepEqual(board.today.map((item) => item.id), ["a", "d"]);
  assert.deepEqual(board.tomorrow.map((item) => item.id), ["f", "g"]);
  assert.deepEqual(board.later.map((item) => item.id), ["c", "e"]);
  assert.equal(board.later[1].date, future);
  assert.equal(board.tomorrow[1].isComplete, true);
});

test("only unfinished tasks with a past date are candidates for Return to Later", () => {
  const yesterday = dates.shiftDay(today, -1);
  assert.equal(planner.isPastAndOpen(task({ date: yesterday })), true);
  assert.equal(planner.isPastAndOpen(task({ date: yesterday, isComplete: true })), false);
  assert.equal(planner.isPastAndOpen(task({ date: today })), false);
  assert.equal(planner.isPastAndOpen(task({ date: null })), false);
  assert.equal(planner.isPastAndOpen(task({ date: "soon" })), false);
});

test("goals are the saved names plus any goal named on a task, counted without regard to case", () => {
  const summaries = planner.goalSummaries(
    [
      task({ label: "grow a little", isComplete: true }),
      task({ label: "Grow a little" }),
      task({ label: " Make something " }),
      task({ label: null }),
    ],
    ["Grow a little", "Explore more"],
  );
  assert.deepEqual(
    summaries.map((goal) => [goal.name.toLowerCase(), goal.total, goal.completed]),
    [
      ["explore more", 0, 0],
      ["grow a little", 2, 1],
      ["make something", 1, 0],
    ],
  );
});

test("task rows from the server are read defensively", () => {
  const row = planner.readTask({ id: "1", content: "Read", is_complete: true, category: "Books", priority: 7, target_group: "nowhere", date: "2026-10-07T00:00:00", execution_target: "codex" });
  assert.deepEqual(
    [row.isComplete, row.label, row.priority, row.target_group, row.date, row.execution_target],
    [true, "Books", 3, "upcoming", "2026-10-07", "codex"],
  );
  assert.equal(planner.readTask({ id: 1, content: "x" }), null);
  assert.equal(planner.readTask({ id: "1", content: "x", label: "  " }).label, null);
});

test("notes keep fields this app does not know and drop tasks it cannot show", () => {
  const value = {
    id: "n1",
    title: "A calmer week",
    body: "Walk more.",
    pinned: true,
    updatedAt: "2026-10-07T10:00:00.000Z",
    tone: "sage",
    fromANewerApp: { kept: true },
    tasks: [
      { id: "a", content: "Practice", isComplete: false, priority: 2, target_group: "today", date: "2026-10-07" },
      { id: "a", content: "Duplicate id", isComplete: false },
      { id: "b", content: "   ", isComplete: false },
      { id: "c", content: "No status" },
    ],
  };
  const note = planner.readNote("n1", value);
  assert.equal(note.tone, "sage");
  assert.deepEqual(note.fromANewerApp, { kept: true });
  assert.deepEqual(note.tasks.map((item) => item.id), ["a"]);
  assert.equal(planner.readNote("other", value), null);
  assert.equal(planner.readNote("n1", { ...value, updatedAt: "yesterday" }), null);
  assert.equal(planner.readNote("n1", { ...value, tone: "neon" }).tone, undefined);
  assert.equal(planner.isBriefId("offtask-prd:123"), true);

  const [first] = planner.tasksInNotes([note]);
  assert.equal(first.id, "note-task:n1:a");
  assert.equal(first.noteTitle, "A calmer week");
  assert.equal(planner.isNoteTaskId(first.id), true);
});

test("saving a note trims it, names an untitled one and keeps its pin and paper", () => {
  const previous = { id: "n1", title: "Old", body: "Old", pinned: true, updatedAt: "2026-10-01T00:00:00.000Z", tone: "sand", tasks: [] };
  const saved = planner.composeNote({ title: "  ", body: "  New text  " }, previous, "2026-10-07T00:00:00.000Z");
  assert.deepEqual(
    [saved.id, saved.title, saved.body, saved.pinned, saved.tone, saved.updatedAt],
    ["n1", "Untitled note", "New text", true, "sand", "2026-10-07T00:00:00.000Z"],
  );
  const created = planner.composeNote({ title: "Fresh", body: "" });
  assert.equal(created.pinned, false);
  assert.ok(created.id.length > 5);
  assert.throws(() => planner.composeNote({ title: " ", body: "" }), /Add a title or note/);
  // A note that is only a task list is still worth saving.
  assert.equal(planner.composeNote({ title: "", body: "", tasks: [{ id: "a", content: "x", isComplete: false, priority: 0, target_group: "today", date: null }] }).tasks.length, 1);
});

test("notes list pinned first, then most recently changed", () => {
  const notes = [
    { id: "a", title: "A", body: "", pinned: false, updatedAt: "2026-10-03T00:00:00.000Z" },
    { id: "b", title: "B", body: "", pinned: true, updatedAt: "2026-10-01T00:00:00.000Z" },
    { id: "c", title: "C", body: "", pinned: false, updatedAt: "2026-10-05T00:00:00.000Z" },
  ];
  assert.deepEqual(planner.filterNotes(notes, false).map((note) => note.id), ["b", "c", "a"]);
  assert.deepEqual(planner.filterNotes(notes, true).map((note) => note.id), ["b"]);
});

test("search covers tasks, notes and goals and ranks exact titles first", () => {
  const tasks = [task({ id: "1", content: "Walk", date: today, target_group: "today", label: "Grow a little" }), task({ id: "2", content: "Plan a walk in the hills", isComplete: true })];
  const notes = [{ id: "n", title: "Walking routes", body: "Hills", pinned: true, updatedAt: "2026-10-07T12:00:00.000Z" }];
  const results = planner.searchEverything(tasks, notes, ["Walk more"], "walk");
  assert.deepEqual(results.map((result) => result.kind + ":" + result.title), [
    "task:Walk",
    "goal:Walk more",
    "note:Walking routes",
    "task:Plan a walk in the hills",
  ]);
  assert.equal(results[0].subtitle, "Today · Grow a little · Open");
  assert.equal(results[3].subtitle, "Later · Completed");
  assert.match(results[2].subtitle, /^Note · Pinned · /);
  assert.deepEqual(planner.searchEverything(tasks, notes, [], "   "), []);
  assert.equal(planner.searchEverything(tasks, notes, [], "later").length, 1);
});

test("a goal's default colour comes from its name, so every device agrees", () => {
  const expected = (name) => Array.from(name).reduce((value, char) => (value * 31 + char.codePointAt(0)) >>> 0, 0) % planner.goalColors.length;
  for (const name of ["Grow a little", "Make something", "Explore more", "🌱 Garden"]) {
    assert.deepEqual(planner.defaultGoalAppearance(name), { color: expected(name), emoji: null });
  }
  const previous = { color: 2, emoji: null };
  for (let index = 0; index < 40; index += 1) {
    const next = planner.surpriseGoalAppearance(previous);
    assert.notEqual(next.color, previous.color);
    assert.ok(planner.goalEmoji.includes(next.emoji));
  }
  assert.equal(planner.goalInitials("grow a little"), "GA");
  assert.equal(planner.goalInitials("  "), "G");
});

test("the month grid starts on Monday and day arithmetic stays inside real months", () => {
  // October 2026 starts on a Thursday.
  assert.deepEqual(dates.monthGrid("2026-10-07"), { start: "2026-09-28", weeks: 5, month: 9, year: 2026 });
  // February 2027 starts on a Monday and needs exactly four rows.
  assert.deepEqual(dates.monthGrid("2027-02-10"), { start: "2027-02-01", weeks: 4, month: 1, year: 2027 });
  assert.equal(dates.weekIndex("2026-10-07"), 1);
  assert.equal(dates.shiftMonth("2026-01-31", 1), "2026-02-28");
  assert.equal(dates.shiftMonth("2026-03-31", -1), "2026-02-28");
  assert.equal(dates.shiftMonth("2026-12-15", 1), "2027-01-15");
  assert.equal(dates.shiftDay("2026-12-31", 1), "2027-01-01");
  assert.equal(dates.isDay("2026-10-07"), true);
  assert.equal(dates.isDay("soon"), false);
  assert.equal(dates.weekdayInitials.length, 7);
  assert.equal(dates.weekdayInitials[0].long, "Monday");
});
