import { App } from "@modelcontextprotocol/ext-apps";

type Data = Record<string, unknown>;
const object = (value: unknown): Data =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Data)
    : {};
const string = (value: unknown) => (typeof value === "string" ? value : "");
const app = new App({ name: "Offtasks tasks", version: "0.1.0" }, {});
const content = document.getElementById("tasks")!;
const status = document.getElementById("status")!;
const refreshButton = document.getElementById("refresh") as HTMLButtonElement;
const planButton = document.getElementById("plan") as HTMLButtonElement;
const handoff = document.getElementById("handoff")!;
const instruction = document.getElementById(
  "instruction"
) as HTMLTextAreaElement;
let args: Data = {},
  tasks: Data[] = [],
  nextCursor = "",
  connected = false;
let hasData = false,
  sequence = 0,
  busy = false;

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  value?: string,
  cls?: string
) {
  const node = document.createElement(tag);
  if (value !== undefined) node.textContent = value;
  if (cls) node.className = cls;
  return node;
}

function clear() {
  sequence++;
  busy = false;
  tasks = [];
  hasData = false;
  nextCursor = "";
  content.replaceChildren();
  handoff.hidden = true;
  instruction.value = "";
  refreshButton.disabled = !connected;
  planButton.disabled = true;
}

function schedule(task: Data) {
  const date = string(task.date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const parsed = new Date(`${date}T12:00:00`);
    if (!Number.isNaN(parsed.getTime()))
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(parsed);
  }
  if (task.target_group === "today") return "Today";
  if (task.target_group === "tomorrow") return "Tomorrow";
  return "Later";
}

function render() {
  content.replaceChildren();
  planButton.disabled = !tasks.length;
  if (!hasData) return;
  if (!tasks.length) {
    content.append(element("p", "No tasks here yet.", "empty"));
  } else {
    const list = element("ul", undefined, "task-list");
    for (const task of tasks) {
      const done = task.isComplete === true || task.status === "done";
      const row = element("li", undefined, "task");
      const check = element(
        "span",
        done ? "✓" : undefined,
        done ? "check done" : "check"
      );
      check.setAttribute("aria-hidden", "true");
      const detail = element("div", undefined, "detail");
      const title = element(
        "span",
        string(task.content) || string(task.title) || "Untitled task",
        done ? "title complete" : "title"
      );
      const noteTitle = task.origin === "note" ? string(task.note_title) : "";
      const meta = element(
        "span",
        `${done ? "Completed · " : ""}${schedule(task)}${
          noteTitle ? ` · ${noteTitle}` : ""
        }`,
        "meta"
      );
      detail.append(title, meta);
      row.append(check, detail);
      list.append(row);
    }
    content.append(list);
  }
  if (nextCursor) {
    const more = element("button", "Show more", "more");
    more.type = "button";
    more.disabled = busy;
    more.onclick = () => void load(true);
    content.append(more);
  }
}

function consume(value: unknown, append = false) {
  if (document.hidden) return;
  const response = object(value),
    envelope = object(response.structuredContent);
  if (envelope.ok !== true) {
    const error = object(envelope.error),
      code = string(error.code);
    if (["unauthenticated", "forbidden", "not_found"].includes(code)) clear();
    status.textContent =
      string(error.message) || "Couldn’t refresh tasks. Try again.";
    if (tasks.length)
      status.textContent = `May be out of date · ${status.textContent}`;
    return;
  }
  const data = object(envelope.data);
  const entries = Array.isArray(data.tasks) ? data.tasks.map(object) : [];
  tasks = append ? [...tasks, ...entries] : entries;
  hasData = true;
  nextCursor = string(data.next_cursor);
  status.textContent = "";
  render();
}

async function load(append = false) {
  if (!connected || !app.getHostCapabilities()?.serverTools) {
    status.textContent = "Ask ChatGPT to refresh your Offtasks list.";
    return;
  }
  const current = ++sequence;
  busy = true;
  refreshButton.disabled = true;
  status.textContent = tasks.length ? "Refreshing…" : "Loading tasks…";
  try {
    const result = await app.callServerTool({
      name: "list_tasks",
      arguments: append
        ? { ...args, cursor: nextCursor }
        : { ...args, cursor: undefined },
    });
    if (current === sequence) consume(result, append);
  } catch {
    if (current === sequence) {
      clear();
      status.textContent = "Connection unavailable. Refresh to try again.";
    }
  } finally {
    if (current === sequence) {
      busy = false;
      refreshButton.disabled = false;
      render();
    }
  }
}

async function plan() {
  const message =
    "Help me organize and schedule my current Offtasks tasks. Ask before making any changes, and do not claim that a scheduled date creates a reminder.";
  handoff.hidden = true;
  if (app.getHostCapabilities()?.message?.text) {
    try {
      const result = await app.sendMessage({
        role: "user",
        content: [{ type: "text", text: message }],
      });
      if (!result.isError) return;
    } catch {
      /* Offer a copyable instruction when this host has no message bridge. */
    }
  }
  instruction.value = message;
  handoff.hidden = false;
  instruction.focus();
  instruction.select();
}

refreshButton.onclick = () => void load();
planButton.onclick = () => void plan();
app.ontoolinput = ({ arguments: input }) => {
  clear();
  args = { ...object(input) };
  status.textContent = "Loading tasks…";
};
app.ontoolresult = (result) => consume(result);
app.onhostcontextchanged = (context) => {
  if (context.theme) document.documentElement.dataset.theme = context.theme;
};
app.onteardown = async () => {
  clear();
  connected = false;
  return {};
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clear();
  else if (connected) void load();
});
app
  .connect()
  .then(() => {
    connected = true;
    refreshButton.disabled = false;
    const theme = app.getHostContext()?.theme;
    if (theme) document.documentElement.dataset.theme = theme;
  })
  .catch(() => {
    clear();
    status.textContent = "Connection unavailable.";
  });
