import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Bell, CalendarDays, Check, Minus, Trash2, X } from "lucide-react";
import { MonthCalendar } from "./MonthCalendar";
import { TaskWorkDetails } from "./TaskWorkDetails";
import { shiftDay, shortDate, today } from "./dates";
import { groupForDate, isNoteTaskId, priorities, scheduledDay, type PlannerTask } from "./model";
import { errorText, notify } from "./notices";
import { useReminders, type ReminderSelection } from "./ReminderProvider";
import { defaultReminderDate, formatReminder, localReminderInput, reminderFromInput } from "./reminders";
import { usePlanner } from "./store";
import { AutoTextarea, Confirm, PriorityMark, Sheet } from "./ui";

export interface ComposerRequest {
  /** The task being edited; absent when adding one. */
  task?: PlannerTask;
  /** The day a new task starts on; null for Later. */
  date?: string | null;
  /** Set inside a goal: new tasks join it and priority becomes available. */
  goal?: string | null;
}

/**
 * Writing or editing a task: text and a date. Inside a goal, priority too.
 * A goal or priority already on a task is kept, never silently cleared.
 */
export function TaskComposer({ request, onClose }: { request: ComposerRequest | null; onClose: () => void }) {
  // The last request stays on screen while the sheet eases out.
  const [last, setLast] = useState<ComposerRequest | null>(request);
  useEffect(() => {
    if (request) setLast(request);
  }, [request]);
  const shown = request ?? last;
  return (
    <Sheet
      open={!!request}
      onClose={onClose}
      title={shown?.task ? "Edit task" : "New task"}
      onOpenAutoFocus={(event) => event.preventDefault()}
    >
      {shown ? <ComposerBody key={shown.task?.id ?? "new"} request={shown} onClose={onClose} /> : null}
    </Sheet>
  );
}

type ComposerStep = "write" | "date" | "priority" | "reminder";

function ComposerBody({ request, onClose }: { request: ComposerRequest; onClose: () => void }) {
  const planner = usePlanner();
  const { getReminder, saveReminder } = useReminders();
  const { task, goal } = request;
  const [content, setContent] = useState(task?.content ?? "");
  const [date, setDate] = useState<string | null>(task ? task.date : (request.date ?? null));
  const [priority, setPriority] = useState(task?.priority ?? 0);
  const [step, setStep] = useState<ComposerStep>("write");
  const [reminderDraft, setReminderDraft] = useState<ReminderSelection | null>();
  const reminder = reminderDraft === undefined ? (task ? getReminder(task.id) : null) : reminderDraft?.at;
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const previousHeight = useRef(0);
  const transition = useRef<Animation | null>(null);
  const trimmed = content.trim();
  const marked = useMemo(
    () => new Set(planner.tasks.map((task) => scheduledDay(task, planner.day)).filter((day): day is string => !!day)),
    [planner.day, planner.tasks],
  );

  useEffect(() => {
    if (step !== "write") return;
    const area = field.current;
    if (!area) return;
    area.focus({ preventScroll: true });
    area.setSelectionRange(area.value.length, area.value.length);
  }, [step]);

  const showStep = (next: ComposerStep) => {
    previousHeight.current = body.current?.getBoundingClientRect().height ?? 0;
    transition.current?.cancel();
    setStep(next);
  };

  useLayoutEffect(() => {
    const wrapper = body.current;
    const from = previousHeight.current;
    previousHeight.current = 0;
    if (!wrapper || !from || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const to = wrapper.getBoundingClientRect().height;
    if (Math.abs(from - to) < 1) return;
    transition.current = wrapper.animate(
      [{ height: `${from}px`, overflow: "clip" }, { height: `${to}px`, overflow: "clip" }],
      { duration: 320, easing: getComputedStyle(wrapper).getPropertyValue("--ot-ease").trim() },
    );
  }, [step]);

  const submit = async () => {
    if (!trimmed || saving) return;
    if (reminderDraft && Date.parse(reminderDraft.at) <= Date.now()) {
      notify("Choose a later reminder time");
      showStep("reminder");
      return;
    }
    setSaving(true);
    try {
      let target: Pick<PlannerTask, "id" | "noteId">;
      if (task) {
        // An untouched date keeps its group too, so nothing moves by itself.
        const sameDay = date === task.date;
        await planner.changeTask(task, {
          content: trimmed,
          date,
          target_group: sameDay ? task.target_group : groupForDate(date),
          priority,
          label: task.label,
        });
        target = task;
      } else {
        target = { id: await planner.addTask({ content: trimmed, date, priority, label: goal ?? null }) };
      }
      if (reminderDraft !== undefined) {
        try {
          await saveReminder(target, reminderDraft);
        } catch (caught) {
          notify("Task saved. Reminder not saved.", errorText(caught, "Open the task to try the reminder again."));
        }
      }
      onClose();
    } catch (caught) {
      if (!task) notify("Could not create task", errorText(caught));
    } finally {
      setSaving(false);
    }
  };

  const datePicker = () => (
      <div className="composer">
        <header className="sheet-head">
          <button type="button" className="ot-round ot-round--plain" aria-label="Back" onClick={() => showStep("write")}>
            <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <h2>Date</h2>
          <span className="sheet-head-spacer" />
        </header>
        <MonthCalendar
          day={date ?? today()}
          onChange={(next) => {
            setDate(next);
            showStep("write");
          }}
          markedDays={marked}
          expanded
          onExpandedChange={() => undefined}
          collapsible={false}
        />
        <div className="composer-quick">
          <button type="button" className="ot-chip" data-set={date === today() || undefined} onClick={() => { setDate(today()); showStep("write"); }}>
            Today
          </button>
          <button type="button" className="ot-chip" data-set={date === shiftDay(today(), 1) || undefined} onClick={() => { setDate(shiftDay(today(), 1)); showStep("write"); }}>
            Tomorrow
          </button>
          <button type="button" className="ot-chip" data-set={date === null || undefined} onClick={() => { setDate(null); showStep("write"); }}>
            No date
          </button>
        </div>
      </div>
    );

  const editor = () => (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <header className="sheet-head">
        <button type="button" className="ot-round ot-round--plain" aria-label="Close" disabled={saving} onClick={onClose}>
          <X size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <span className="sheet-head-spacer" />
        {task ? (
          <button
            type="button"
            className="ot-round ot-round--plain composer-remove"
            aria-label="Remove task"
            data-tip="Remove"
            disabled={saving}
            onClick={() => setConfirming(true)}
          >
            <Trash2 size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>
        ) : null}
        <button type="submit" className="ot-button ot-button--small" disabled={!trimmed || saving} aria-label={saving ? "Saving" : undefined}>
          {saving ? <i className="composer-saving" aria-hidden="true" /> : task ? "Save" : "Add"}
        </button>
      </header>

      <AutoTextarea
        ref={field}
        className="composer-text"
        maxLength={2000}
        placeholder="What needs to be done?"
        aria-label="Task"
        value={content}
        disabled={saving}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void submit();
          }
        }}
      />

      <div className="composer-chips">
        <button type="button" className="ot-chip" data-set={date ? "" : undefined} disabled={saving} onClick={() => showStep("date")}>
          <CalendarDays size={15} strokeWidth={1.8} aria-hidden="true" />
          {date ? (date === today() ? "Today" : shortDate(date)) : "No date"}
        </button>
        {task?.isComplete ? null : (
          <button
            type="button"
            className="ot-chip"
            data-set={reminder ? "" : undefined}
            aria-label={reminder ? `Reminder: ${formatReminder(reminder)}` : "Remind me"}
            disabled={saving}
            onClick={() => showStep("reminder")}
          >
            <Bell size={15} strokeWidth={1.8} aria-hidden="true" />
            {reminder ? formatReminder(reminder) : "Remind me"}
          </button>
        )}
        {goal ? (
          <button
            type="button"
            className="ot-chip"
            data-set={priority ? "" : undefined}
            aria-expanded={step === "priority"}
            disabled={saving}
            onClick={() => showStep(step === "priority" ? "write" : "priority")}
          >
            <PriorityMark value={priority} />
            {priority ? priorities[priority].label : "Priority"}
          </button>
        ) : null}
      </div>

      {step === "priority" ? (
        <div className="composer-options" role="group" aria-label="Priority">
          <p>
            Priority <span>Optional</span>
          </p>
          {priorities.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={priority === option.value}
              onClick={() => {
                setPriority(option.value);
                showStep("write");
              }}
            >
              <PriorityMark value={option.value} />
              <span>{option.label}</span>
              {priority === option.value ? <Check size={16} strokeWidth={1.8} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}

      {task && goal && !isNoteTaskId(task.id) ? <TaskWorkDetails taskId={task.id} /> : null}

      <Confirm
        open={confirming}
        title="Remove task"
        message="Are you sure you want to delete this task?"
        confirmLabel="Delete"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          if (task) void planner.removeTask(task).then(onClose, () => undefined);
        }}
      />
    </form>
  );

  return (
    <div ref={body}>
      {step === "date" ? datePicker() : step === "reminder" ? (
        <ReminderStep
          at={reminder}
          taskDate={date}
          onBack={() => showStep("write")}
          onChange={(selection) => {
            setReminderDraft(selection);
            showStep("write");
          }}
        />
      ) : editor()}
    </div>
  );
}

function ReminderStep({ at, taskDate, onBack, onChange }: {
  at?: string | null;
  taskDate: string | null;
  onBack: () => void;
  onChange: (selection: ReminderSelection | null) => void;
}) {
  const { chooseReminder } = useReminders();
  const [input, setInput] = useState(() => localReminderInput(at ? new Date(at) : defaultReminderDate(taskDate)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const back = useRef<HTMLButtonElement>(null);

  useEffect(() => { back.current?.focus({ preventScroll: true }); }, []);

  const confirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const selected = reminderFromInput(input);
    if (!selected) {
      setError("Choose a date and time in the future.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      onChange(await chooseReminder(selected));
    } catch (caught) {
      setError(errorText(caught, "Notifications couldn’t be enabled. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="composer composer-reminder" onSubmit={(event) => void confirm(event)} noValidate>
      <header className="sheet-head reminder-head">
        <button ref={back} type="button" className="ot-round ot-round--plain" aria-label="Back" onClick={onBack} disabled={busy}>
          <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <h2>Reminder</h2>
        <button type="submit" className="ot-button ot-button--small" disabled={busy}>Done</button>
      </header>
      <label className="reminder-field">
        <span>Date and time</span>
        <input
          type="datetime-local"
          className="ot-input"
          value={input}
          min={localReminderInput(new Date())}
          aria-describedby="offtasks-reminder-hint"
          disabled={busy}
          onChange={(event) => { setInput(event.target.value); setError(""); }}
        />
      </label>
      <p id="offtasks-reminder-hint" className="reminder-hint">
        Notifications on this browser, even when the tab is closed.
      </p>
      {error ? <p className="reminder-error" role="alert">{error}</p> : null}
      <button type="button" className="ot-chip reminder-clear" onClick={() => onChange(null)} disabled={busy}>
        <Minus size={15} strokeWidth={1.8} aria-hidden="true" />
        No reminder
      </button>
    </form>
  );
}
