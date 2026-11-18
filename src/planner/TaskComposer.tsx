import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, Check, Trash2, X } from "lucide-react";
import { MonthCalendar } from "./MonthCalendar";
import { TaskWorkDetails } from "./TaskWorkDetails";
import { shiftDay, shortDate, today } from "./dates";
import { groupForDate, isNoteTaskId, priorities, scheduledDay, type PlannerTask } from "./model";
import { errorText, notify } from "./notices";
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

function ComposerBody({ request, onClose }: { request: ComposerRequest; onClose: () => void }) {
  const planner = usePlanner();
  const { task, goal } = request;
  const [content, setContent] = useState(task?.content ?? "");
  const [date, setDate] = useState<string | null>(task ? task.date : (request.date ?? null));
  const [priority, setPriority] = useState(task?.priority ?? 0);
  const [step, setStep] = useState<"write" | "date" | "priority">("write");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const trimmed = content.trim();
  const marked = useMemo(
    () => new Set(planner.tasks.map(scheduledDay).filter((day): day is string => !!day)),
    [planner.tasks],
  );

  useEffect(() => {
    if (step !== "write") return;
    const area = field.current;
    if (!area) return;
    area.focus({ preventScroll: true });
    area.setSelectionRange(area.value.length, area.value.length);
  }, [step]);

  const submit = async () => {
    if (!trimmed || saving) return;
    setSaving(true);
    try {
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
      } else {
        await planner.addTask({ content: trimmed, date, priority, label: goal ?? null });
      }
      onClose();
    } catch (caught) {
      if (!task) notify("Could not create task", errorText(caught));
    } finally {
      setSaving(false);
    }
  };

  if (step === "date")
    return (
      <div className="composer">
        <header className="sheet-head">
          <button type="button" className="ot-round ot-round--plain" aria-label="Back" onClick={() => setStep("write")}>
            <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <h2>Date</h2>
          <span className="sheet-head-spacer" />
        </header>
        <MonthCalendar
          day={date ?? today()}
          onChange={(next) => {
            setDate(next);
            setStep("write");
          }}
          markedDays={marked}
          expanded
          onExpandedChange={() => undefined}
          collapsible={false}
        />
        <div className="composer-quick">
          <button type="button" className="ot-chip" data-set={date === today() || undefined} onClick={() => { setDate(today()); setStep("write"); }}>
            Today
          </button>
          <button type="button" className="ot-chip" data-set={date === shiftDay(today(), 1) || undefined} onClick={() => { setDate(shiftDay(today(), 1)); setStep("write"); }}>
            Tomorrow
          </button>
          <button type="button" className="ot-chip" data-set={date === null || undefined} onClick={() => { setDate(null); setStep("write"); }}>
            No date
          </button>
        </div>
      </div>
    );

  return (
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
        <button type="button" className="ot-chip" data-set={date ? "" : undefined} disabled={saving} onClick={() => setStep("date")}>
          <CalendarDays size={15} strokeWidth={1.8} aria-hidden="true" />
          {date ? (date === today() ? "Today" : shortDate(date)) : "No date"}
        </button>
        {goal ? (
          <button
            type="button"
            className="ot-chip"
            data-set={priority ? "" : undefined}
            aria-expanded={step === "priority"}
            disabled={saving}
            onClick={() => setStep(step === "priority" ? "write" : "priority")}
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
                setStep("write");
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
}
