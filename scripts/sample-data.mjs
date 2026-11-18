// Sample planner content for the local stand-in backend (scripts/sample-backend.mjs).
// It mirrors the example content used in the Offtasks mobile design reference.
// The account below exists only in this file; it is not a real sign-in.
export const sampleAccount = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Alex Morgan",
  email: "alex@example.com",
  password: "sample-planner",
};

const day = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
};
const group = (date) => (!date ? "upcoming" : date <= day(0) ? "today" : date === day(1) ? "tomorrow" : "upcoming");

export function sampleState() {
  const owner = sampleAccount.id;
  const goals = {
    grow: "22222222-2222-4222-8222-222222222201",
    make: "22222222-2222-4222-8222-222222222202",
    explore: "22222222-2222-4222-8222-222222222203",
  };
  let counter = 0;
  const task = (content, date, extra = {}) => {
    counter += 1;
    return {
      id: `33333333-3333-4333-8333-${String(counter).padStart(12, "0")}`,
      user_id: owner,
      content,
      isComplete: false,
      priority: 0,
      target_group: group(date),
      date,
      label: null,
      completed_at: null,
      inserted_at: new Date(Date.now() - counter * 3600_000).toISOString(),
      revision: 1,
      execution_target: null,
      work_stage: "not_started",
      acceptance_criteria: [],
      goal_id: null,
      ...extra,
    };
  };
  const plan = {
    id: "44444444-4444-4444-8444-444444444401",
    user_id: owner,
    goal_id: goals.make,
    source_prd_id: "offtask-prd:55555555-5555-4555-8555-555555555501",
    source_prd_revision: 2,
    summary: "Start small: one shelf, finished in a weekend, then decide what comes next.",
    revision: 1,
    items: [
      { id: "measure", title: "Measure the wall and sketch the shelf", description: "A single drawing with the three sizes that matter." },
      { id: "wood", title: "Choose the wood", description: "Oak if the budget allows, pine otherwise." },
      { id: "build", title: "Cut, sand and assemble" },
    ],
  };
  const tasks = [
    task("Make room for a walk", day(0)),
    task("Read a few pages", day(0), { isComplete: true, completed_at: day(0), label: "Grow a little", goal_id: goals.grow, priority: 1 }),
    task("Try one new thing", null, { label: "Grow a little", goal_id: goals.grow, priority: 2 }),
    task("Sketch a weekend idea", null),
    task("Find a new trail", null),
    task("Water the plants", day(1)),
    task("Call the dentist", day(3)),
    task("Pick a trail for Saturday", day(2), { label: "Explore more", goal_id: goals.explore, priority: 3 }),
    task("Check the weather", day(5), { label: "Explore more", goal_id: goals.explore }),
    task("Book the campsite", day(-2), { isComplete: true, completed_at: day(-2), label: "Explore more", goal_id: goals.explore, priority: 2 }),
    task("Borrow a tent", day(-1), { isComplete: true, completed_at: day(-1), label: "Explore more", goal_id: goals.explore }),
    task("Send the invoice", day(8)),
    task("Renew the library card", day(15)),
    task("Measure the wall and sketch the shelf", null, { label: "Make something", goal_id: goals.make, priority: 3, execution_target: "codex", work_stage: "ready", acceptance_criteria: ["One drawing with width, height and depth", "Fits between the window and the door"], source_plan_id: plan.id, source_plan_item_id: "measure" }),
    task("Choose the wood", null, { label: "Make something", goal_id: goals.make, priority: 1, source_plan_id: plan.id, source_plan_item_id: "wood" }),
  ];
  const noteTask = (id, content, date, extra = {}) => ({ id, content, isComplete: false, priority: 0, target_group: group(date), date, ...extra });
  const note = (id, title, body, extra = {}) => ({
    user_id: owner,
    kind: "note",
    id,
    value: { id, title, body, pinned: false, updatedAt: new Date(Date.now() - 86_400_000).toISOString(), ...extra },
    deleted: false,
    revision: 2,
  });
  const goalItem = (name) => ({ user_id: owner, kind: "goal", id: name.toLocaleLowerCase(), value: name, deleted: false, revision: 1 });
  const goalRow = (id, title, extra = {}) => ({ id, user_id: owner, legacy_goal_id: title.toLocaleLowerCase(), title, outcome: "", priority: 0, status: "active", prd_id: null, prd_acceptance_criteria: [], plan_id: null, revision: 3, updated_at: new Date().toISOString(), ...extra });
  return {
    tasks,
    planner_items: [
      note("note-calmer-week", "A calmer week", "Walk more. Keep a little room for the unexpected.\n\nFinish the small things\nKeep evenings free", {
        pinned: true,
        tone: "sage",
        updatedAt: new Date().toISOString(),
        tasks: [noteTask("practice", "Practice for ten minutes", day(0), { label: "Grow a little", priority: 3 }), noteTask("walk", "Walk before work", day(5))],
      }),
      note("note-small-things", "Small things worth keeping", "A good book, a new recipe, a place to return to."),
      note("note-weekend", "Weekend ideas", "A trail, a picnic and no particular hurry.", { tone: "sand" }),
      note(plan.source_prd_id, "Make something · PRD", "Build one piece of furniture by hand this season.\n\nIt should be useful every day, small enough to finish, and made well enough to keep."),
      goalItem("Grow a little"),
      goalItem("Make something"),
      goalItem("Explore more"),
    ],
    user_preferences: [{ user_id: owner, hide_completed: false, advanced_mode: false, theme_mode: "Light", auto_arrange: false, updated_at: new Date().toISOString() }],
    contact_messages: [],
    offtask_goals: [
      goalRow(goals.grow, "Grow a little", { outcome: "A few small habits that stay." }),
      goalRow(goals.make, "Make something", { outcome: "One hand-made shelf in the living room.", prd_id: plan.source_prd_id, prd_acceptance_criteria: ["Holds forty books", "No visible screws"], plan_id: plan.id }),
      goalRow(goals.explore, "Explore more"),
    ],
    offtask_plans: [plan],
    offtask_goal_logos: [],
    offtask_task_results: [
      {
        id: "66666666-6666-4666-8666-666666666601",
        task_id: tasks[13].id,
        summary: "Measured the wall: 182 cm between the window frame and the door. Drafted two layouts.",
        blockers: [],
        validation: ["Both layouts leave 10 cm clearance for the door"],
        links: [],
        created_at: new Date(Date.now() - 7200_000).toISOString(),
      },
    ],
    chatgpt:
      process.env.SAMPLE_CHATGPT === "authorized"
        ? { status: "authorized", install_url: "https://chatgpt.com/plugins/offtasks", permissions: ["read", "write"], revision: "3" }
        : { status: "disconnected", install_url: "https://chatgpt.com/plugins/offtasks", permissions: [], revision: null },
  };
}
