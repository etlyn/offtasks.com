import { App } from "@modelcontextprotocol/ext-apps";

type RecordData = Record<string, unknown>;
const record = (v: unknown): RecordData =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as RecordData)
    : {};
const array = (v: unknown): RecordData[] =>
  Array.isArray(v) ? v.map(record) : [];
const text = (v: unknown) =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
const app = new App({ name: "Offtasks plan", version: "0.1.0" }, {});
const area = document.getElementById("content")!,
  status = document.getElementById("status")!,
  handoff = document.getElementById("handoff")!,
  instruction = document.getElementById("instruction") as HTMLTextAreaElement;
const refreshButton = document.getElementById("refresh") as HTMLButtonElement;
let args: RecordData = {},
  data: RecordData = {},
  refreshTime = "",
  sequence = 0,
  connected = false,
  stale = false;
let activeRefresh: number | null = null;

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  value?: string,
  cls?: string
) {
  const n = document.createElement(tag);
  if (value !== undefined) n.textContent = value;
  if (cls) n.className = cls;
  return n;
}
function action(label: string, handler: () => void, cls?: string) {
  const n = element("button", label, cls);
  n.type = "button";
  n.onclick = handler;
  return n;
}
function clear() {
  sequence++;
  activeRefresh = null;
  refreshButton.disabled = connected && !app.getHostCapabilities()?.serverTools;
  data = {};
  area.replaceChildren();
  handoff.hidden = true;
  instruction.value = "";
}
function notify(message: string) {
  status.textContent = message;
}
function safeUrl(value: unknown): string | undefined {
  try {
    const u = new URL(text(value));
    return u.protocol === "https:" ? u.href : undefined;
  } catch {
    return undefined;
  }
}
async function open(url: string) {
  if (app.getHostCapabilities()?.openLinks) {
    const result = await app.openLink({ url });
    if (!result.isError) return;
  }
  const a = element("a", "Open link");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  area.append(a);
}
function url() {
  const u = new URL("https://www.offtasks.com/app");
  u.searchParams.set("view", "goals");
  if (typeof args.goal_id === "string")
    u.searchParams.set("goal", args.goal_id);
  return u.href;
}
async function message(value: string) {
  handoff.hidden = true;
  if (app.getHostCapabilities()?.message?.text) {
    try {
      const response = await app.sendMessage({
        role: "user",
        content: [{ type: "text", text: value }],
      });
      if (!response.isError) {
        notify("Added to the conversation. No background run was started.");
        return;
      }
    } catch {
      /* Keep a copyable instruction when the host cannot accept a message. */
    }
  }
  instruction.value = value;
  handoff.hidden = false;
  instruction.focus();
  instruction.select();
  notify("Copy this instruction into your conversation.");
}

function consume(result: unknown) {
  const response = record(result),
    envelope = record(response.structuredContent);
  if (!envelope.ok) {
    const error = record(envelope.error),
      code = text(error.code);
    if (["unauthenticated", "forbidden", "not_found"].includes(code)) clear();
    else stale = true;
    notify(
      (Object.keys(data).length ? "Stale · " : "") +
        (text(error.message) ||
          "Couldn’t refresh. Existing content may be stale.")
    );
    return false;
  }
  data = record(envelope.data);
  refreshTime = text(envelope.fetched_at);
  stale = false;
  render();
  return true;
}

async function refresh() {
  if (!connected || !args.project_id) {
    notify("Choose a current project in the conversation first.");
    return;
  }
  if (!app.getHostCapabilities()?.serverTools) {
    notify("Ask to refresh Offtasks in the conversation.");
    return;
  }
  const current = ++sequence;
  activeRefresh = current;
  refreshButton.disabled = true;
  notify(
    Object.keys(data).length
      ? "Refreshing… previous data may be stale."
      : "Refreshing…"
  );
  try {
    const r = await app.callServerTool({
      name: "render_plan_widget",
      arguments: args,
    });
    if (current === sequence) consume(r);
  } catch {
    if (current === sequence) {
      clear();
      notify(
        "Connection unavailable. Refresh to recheck the connected account."
      );
    }
  } finally {
    if (activeRefresh === current) {
      activeRefresh = null;
      refreshButton.disabled = false;
    }
  }
}

function render() {
  area.replaceChildren();
  handoff.hidden = true;
  notify(
    (stale ? "Stale · " : "") +
      (refreshTime
        ? "Refreshed " + new Date(refreshTime).toLocaleTimeString()
        : "Current records")
  );
  const goals = array(data.goals),
    goal = record(data.goal),
    plan = record(data.plan),
    prd = record(data.prd);
  if (!Object.keys(goal).length) {
    const section = element("section");
    section.append(element("h2", "Your goals"));
    if (!goals.length)
      section.append(
        element("p", "No goals yet. Create one in Offtasks.", "muted")
      );
    for (const g of goals)
      section.append(
        action(
          text(g.title),
          () => {
            args = { ...args, goal_id: text(g.id) };
            void refresh();
          },
          "task"
        )
      );
    if (data.next_cursor)
      section.append(
        action(
          "More goals",
          () => {
            void more("goals", text(data.next_cursor));
          },
          "link"
        )
      );
    area.append(section);
    return;
  }
  const heading = element("section");
  heading.append(
    element("h2", text(goal.title)),
    element("p", text(goal.outcome))
  );
  const info = element("div");
  info.append(element("span", text(goal.status), "badge"));
  if (prd.id)
    info.append(element("span", "PRD r" + text(prd.revision), "badge"));
  heading.append(info);
  heading.append(
    action(
      "Discuss plan",
      () => {
        void message(
          "Discuss the current requirements and plan for Offtasks goal " +
            text(goal.id) +
            ". Fetch fresh full context and show its revisions. Do not save changes unless I request it."
        );
      },
      "link"
    )
  );
  area.append(heading);
  const planning = element("section");
  planning.append(element("h3", "Plan"));
  if (!plan.id) planning.append(element("p", "No saved plan.", "muted"));
  else {
    if (
      plan.requirements_changed === true ||
      text(plan.source_prd_revision) !== text(prd.revision)
    )
      planning.append(
        element(
          "p",
          "Requirements changed. Reconcile this plan before continuing.",
          "notice"
        )
      );
    planning.append(element("p", text(plan.summary)));
    const list = element("ol");
    for (const step of array(plan.items)) {
      const li = element("li");
      li.append(element("span", text(step.title)));
      const linked = array(data.tasks).find(
        (task) =>
          task.source_plan_id === plan.id &&
          task.source_plan_item_id === step.id
      );
      if (linked) {
        li.append(
          element(
            "small",
            " · " + (text(linked.status) || "linked task").replaceAll("_", " ")
          )
        );
        if (Array.isArray(linked.dependencies) && linked.dependencies.length)
          li.append(
            element("small", ` · ${linked.dependencies.length} dependencies`)
          );
      }
      list.append(li);
    }
    planning.append(list, element("small", "Plan r" + text(plan.revision)));
  }
  area.append(planning);
  const tasksSection = element("section"),
    toolbar = element("div", undefined, "row");
  toolbar.append(element("h3", "Tasks"));
  const select = element("select");
  select.setAttribute("aria-label", "Task execution target");
  for (const [value, label] of [
    ["", "All tasks"],
    ["codex", "For Codex"],
  ]) {
    const option = element("option", label);
    option.value = value!;
    select.append(option);
  }
  select.value = text(args.execution_target);
  select.onchange = () => {
    const next = { ...args };
    if (select.value) next.execution_target = select.value;
    else delete next.execution_target;
    args = next;
    void refresh();
  };
  toolbar.append(select);
  tasksSection.append(toolbar);
  let tasks = array(data.tasks);
  if (args.execution_target === "codex")
    tasks = tasks.filter((t) => t.execution_target === "codex");
  if (!tasks.length)
    tasksSection.append(element("p", "No matching tasks.", "muted"));
  for (const task of tasks) {
    const button = action(
      "",
      () => {
        void showTask(text(task.id));
      },
      "task"
    );
    button.append(element("div", text(task.title) || text(task.content)));
    button.append(element("span", text(task.status) || "Open", "badge"));
    if (task.work_stage && task.work_stage !== task.status)
      button.append(
        element("span", text(task.work_stage).replaceAll("_", " "), "badge")
      );
    if (task.execution_target === "codex")
      button.append(element("span", "For Codex", "badge"));
    if (task.eligible === false)
      button.append(element("small", "Needs attention before implementation"));
    tasksSection.append(button);
  }
  if (data.tasks_next_cursor)
    tasksSection.append(
      action(
        "More tasks",
        () => {
          void more("tasks", text(data.tasks_next_cursor));
        },
        "link"
      )
    );
  area.append(tasksSection);
  const note = element(
    "p",
    "Selection adds a request to your conversation. Repository access is still required.",
    "muted"
  );
  area.append(note);
}

async function more(kind: "goals" | "tasks", cursor: string) {
  if (!app.getHostCapabilities()?.serverTools) {
    notify("Ask for more current records in the conversation.");
    return;
  }
  const current = ++sequence;
  notify("Reading more records…");
  const filters = {
    ...(kind === "goals"
      ? { project_id: args.project_id }
      : {
          goal_id: args.goal_id,
          include_note_tasks: false,
          ...(args.execution_target
            ? { execution_target: args.execution_target }
            : {}),
        }),
    limit: 20,
    cursor,
  };
  try {
    const response = await app.callServerTool({
      name: kind === "goals" ? "list_goals" : "list_tasks",
      arguments: filters,
    });
    if (current !== sequence) return;
    const envelope = record(response.structuredContent);
    if (!envelope.ok) {
      consume(response);
      return;
    }
    const next = record(envelope.data),
      all = [...array(data[kind]), ...array(next[kind])];
    data = {
      ...data,
      [kind]: Array.from(new Map(all.map((row) => [row.id, row])).values()),
      [kind === "goals" ? "next_cursor" : "tasks_next_cursor"]:
        next.next_cursor,
    };
    refreshTime = text(envelope.fetched_at);
    render();
  } catch {
    if (current === sequence) {
      clear();
      notify(
        "Couldn’t load records. Refresh to recheck the connected account."
      );
    }
  }
}

async function showTask(id: string) {
  if (!app.getHostCapabilities()?.serverTools) {
    await message(
      "Show full current context for Offtasks task " +
        id +
        ". Do not start implementation."
    );
    return;
  }
  const current = ++sequence;
  notify("Reading task context…");
  try {
    let r = record(
        await app.callServerTool({
          name: "get_task_context",
          arguments: { task_id: id },
        })
      ),
      envelope = record(r.structuredContent),
      details = record(envelope.data);
    if (current !== sequence) return;
    if (!envelope.ok) {
      consume(r);
      return;
    }
    if (details.context_fragment) {
      let combined = text(record(details.context_fragment).text),
        cursor = details.next_cursor;
      for (let pages = 0; cursor && pages < 30; pages++) {
        r = record(
          await app.callServerTool({
            name: "get_task_context",
            arguments: { task_id: id, cursor },
          })
        );
        envelope = record(r.structuredContent);
        if (current !== sequence) return;
        if (!envelope.ok) {
          consume(r);
          return;
        }
        details = record(envelope.data);
        combined += text(record(details.context_fragment).text);
        cursor = details.next_cursor;
      }
      if (cursor) {
        notify(
          "This context is long. Open Offtasks or continue reading in the conversation."
        );
        return;
      }
      details = record(JSON.parse(combined));
    }
    if (current !== sequence) return;
    const task = record(details.task),
      section = element("section");
    section.append(
      action("Back to plan", () => render(), "link"),
      element("h2", text(task.title) || text(task.content)),
      element("p", text(task.description))
    );
    const ac = Array.isArray(task.acceptance_criteria)
      ? task.acceptance_criteria
      : [];
    if (ac.length) {
      section.append(element("h3", "Acceptance criteria"));
      const ul = element("ul");
      for (const criterion of ac) ul.append(element("li", text(criterion)));
      section.append(ul);
    }
    const dependencies = array(details.dependencies);
    if (dependencies.length) {
      section.append(element("h3", "Dependencies"));
      const list = element("ul");
      for (const dependency of dependencies)
        list.append(
          element(
            "li",
            (text(dependency.title) || text(dependency.content)) +
              " · " +
              (text(dependency.status) || "Open").replaceAll("_", " ")
          )
        );
      section.append(list);
    }
    const updates = array(details.recent_updates);
    if (updates.length) section.append(element("h3", "Recent updates"));
    for (const update of updates) {
      section.append(element("p", text(update.summary)));
      for (const k of ["blockers", "validation"])
        if (Array.isArray(update[k]))
          for (const line of update[k])
            section.append(element("small", k + ": " + text(line)));
      if (Array.isArray(update.links))
        for (const link of update.links) {
          const u = safeUrl(typeof link === "string" ? link : record(link).url);
          if (u)
            section.append(
              action(
                u,
                () => {
                  void open(u);
                },
                "link"
              )
            );
        }
    }
    section.append(
      action(task.eligible === true ? "Work on this" : "Discuss task", () => {
        void message(
          (task.eligible === true
            ? "Work on Offtasks task "
            : "Discuss the blockers and context of Offtasks task ") +
            id +
            " for goal " +
            text(record(details.goal).id) +
            (task.eligible === true
              ? ". First fetch current full context and revisions, then verify repository access. Record real validation/results and leave the task for my review."
              : ". Fetch full current context; do not start implementation or change records without my request.")
        );
      })
    );
    area.replaceChildren(section);
    notify("Current task · r" + text(task.revision));
  } catch {
    if (current === sequence) {
      clear();
      notify(
        "Couldn’t read the task. Refresh to recheck the connected account."
      );
    }
  }
}

app.ontoolinput = ({ arguments: input }) => {
  clear();
  args = { ...record(input) };
  notify("Reading current Offtasks records…");
};
app.ontoolresult = (result) => {
  consume(result);
};
app.onhostcontextchanged = (context) => {
  if (context.theme) document.documentElement.dataset.theme = context.theme;
  // Standard host context is presentation (theme/size/locale), not identity.
  // Keep selection stable; new tool input, teardown, hidden documents and
  // authorization failures clear private data instead.
};
app.onteardown = async () => {
  clear();
  connected = false;
  return {};
};
refreshButton.onclick = () => {
  void refresh();
};
document.getElementById("open")!.onclick = () => {
  void open(url());
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clear();
    refreshButton.disabled = false;
    notify("Refresh to load the current connected account.");
  } else if (connected) void refresh();
});
void app
  .connect()
  .then(() => {
    connected = true;
    refreshButton.disabled = !app.getHostCapabilities()?.serverTools;
    const theme = app.getHostContext()?.theme;
    if (theme) document.documentElement.dataset.theme = theme;
    if (!Object.keys(data).length)
      notify("Choose a current project in the conversation.");
  })
  .catch(() => {
    clear();
    notify(
      "The plan widget needs an MCP Apps host. The text tools work without it."
    );
    refreshButton.disabled = true;
  });
