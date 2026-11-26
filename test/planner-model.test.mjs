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
      export * from "./src/planner/tags.ts";
      export * from "./src/planner/chatgptHandoff.ts";
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

test("reusable task tags preserve assignments across rename, reload and unrelated edits", () => {
  let state = planner.readTagState(null);
  state = planner.saveTag(state, "work", "  Client   Work  ");
  state = planner.saveTag(state, "weekend", "Weekend");
  assert.throws(() => planner.saveTag(state, "other", "client work"), /already exists/);
  state = planner.applyTagChanges(state, "a", ["work", "weekend"], []);
  state = planner.applyTagChanges(state, "b", ["work", "work"], []);
  state = planner.applyTagChanges(state, "a", ["unknown"], []);
  state = planner.saveTag(state, "work", "Studio");
  state = planner.readTagState(JSON.stringify(state));
  assert.deepEqual(state.tags.map(({ name }) => name), ["Studio", "Weekend"]);
  assert.deepEqual(planner.taskTagIds(state, "a"), ["work", "weekend"]);
  const tasks = [task({ id: "a" }), task({ id: "b" }), task({ id: "c" })];
  assert.deepEqual(planner.filterByTag(tasks, state, "work").map(({ id }) => id), ["a", "b"]);
  assert.equal(planner.filterByTag(tasks, state, ""), tasks);
  state = planner.removeTag(state, "work");
  assert.deepEqual(state.assignments, { a: ["weekend"] });
  state = planner.forgetTaskTags(state, ["a"]);
  assert.deepEqual(state.assignments, {});
});

test("invalid stored tag entries and deleted IDs cannot reappear in the planner", () => {
  const state = planner.readTagState(JSON.stringify({
    tags: [null, { id: "a", name: "Home" }, { id: "b", name: "home" }, { id: "c", name: "  " }],
    assignments: { t: ["a", "b", "a", 3], other: "a" },
  }));
  assert.deepEqual(state.tags, [{ id: "a", name: "Home" }]);
  assert.deepEqual(state.assignments, { t: ["a"] });
  assert.deepEqual(planner.taskTagIds(state, "__proto__"), []);
  assert.deepEqual(planner.readTagState("{broken"), { tags: [], assignments: {} });
});

test("goal tag assignments use a separate target from a task with the same identifier", () => {
  const state = planner.saveTag(planner.readTagState(null), "home", "Home");
  const tagged = planner.applyTagChanges(state, planner.goalTagKey("same"), ["home"], []);
  assert.deepEqual(planner.taskTagIds(tagged, planner.goalTagKey("same")), ["home"]);
  assert.equal(planner.filterByTag([task({ id: "same" })], tagged, "home").length, 0);
});

test("ChatGPT loading requires the prepared task's matching start receipt and a current in-progress stage", () => {
  const request = { kind: "task", id: "33333333-3333-4333-8333-000000000001", key: "offtasks-web-test-receipt", openedAt: 1 };
  const start = { operation: "update_task", target: request.id, request_key: `${request.key}-start` };
  assert.deepEqual(planner.readChatGPTRequests(JSON.stringify([request])), [request]);
  assert.match(planner.chatGPTPrompt(request), /offtasks-web-test-receipt-start/);
  assert.match(planner.chatGPTPrompt({ ...request, kind: "goal" }), /saved goal description.*outcome/);
  assert.equal(planner.matchesReceipt(request, start), true);
  assert.equal(planner.matchesReceipt(request, { ...start, target: "another-task" }), false);
  assert.equal(planner.matchesReceipt(request, { ...start, operation: "create_task" }), false);
  const running = task({ work_stage: "in_progress" });
  const keys = new Set([start.request_key]);
  assert.equal(planner.chatGPTPhase(running, request, new Set()), "waiting");
  assert.equal(planner.chatGPTPhase(task({ work_stage: "ready" }), request, keys), "waiting");
  assert.equal(planner.chatGPTPhase(running, request, keys), "working");
  assert.equal(planner.chatGPTPhase(task({ work_stage: "awaiting_review" }), request, keys), "review");
  assert.equal(planner.chatGPTPhase(task({ work_stage: "blocked" }), request, keys), "blocked");
  assert.equal(planner.chatGPTPhase({ ...running, isComplete: true }, request, keys), null);
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

test("the note's first line names its card and paragraphs round-trip through the single editor", () => {
  const previous = { id: "n1", title: "Old", body: "Old", pinned: true, updatedAt: "2026-10-01T00:00:00.000Z", tone: "sand", tasks: [] };
  const saved = planner.composeNote({ text: "  New text\n\nNext paragraph\n  Indented line  " }, previous, "2026-10-07T00:00:00.000Z");
  assert.deepEqual(
    [saved.id, saved.title, saved.body, saved.pinned, saved.tone, saved.updatedAt],
    ["n1", "New text", "\nNext paragraph\n  Indented line", true, "sand", "2026-10-07T00:00:00.000Z"],
  );
  assert.equal(planner.noteText(saved), "New text\n\nNext paragraph\n  Indented line");
  const created = planner.composeNote({ text: "Fresh" });
  assert.equal(created.pinned, false);
  assert.equal(created.body, "");
  assert.ok(created.id.length > 5);
  assert.throws(() => planner.composeNote({ text: " " }), /Write a note/);
  // A note that is only a task list is still worth saving.
  const taskOnly = planner.composeNote({ text: "", tasks: [{ id: "a", content: "x", isComplete: false, priority: 0, target_group: "today", date: null }] });
  assert.equal(taskOnly.title, "Untitled note");
  assert.equal(taskOnly.tasks.length, 1);
});

test("saved titles and body stay intact when a legacy note is saved with task edits", () => {
  const previous = {
    id: "n1", title: "Untitled note\nAnother title line", body: "First paragraph\r\n\r\nSecond paragraph", pinned: true,
    updatedAt: "2026-10-01T00:00:00.000Z", tone: "sand", extra: { source: "mobile" },
  };
  const text = planner.noteText(previous);
  assert.equal(text, "Untitled note\nAnother title line\nFirst paragraph\n\nSecond paragraph");
  const now = "2026-10-07T00:00:00.000Z";
  const tasks = [{ id: "task", content: "Keep this", isComplete: true, priority: 0, target_group: "today", date: null }];
  assert.deepEqual(planner.composeNote({ text, tasks }, previous, now), { ...previous, tasks, updatedAt: now });
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
