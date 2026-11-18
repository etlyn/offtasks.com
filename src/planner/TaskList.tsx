import { useState } from "react";
import { Trash2 } from "lucide-react";
import { openFirst, type PlannerTask } from "./model";
import { taskContext, taskWhen } from "./search";
import { usePlanner } from "./store";
import { Checkbox, Confirm, PriorityMark } from "./ui";

type Detail = "plan" | "goal" | "context";

/**
 * Unboxed task rows with faint dividers. Finished tasks settle at the bottom.
 * `detail` picks the second line: where the task belongs ("plan"), its stage
 * inside a goal ("goal"), or its day ("context", used by Statistics).
 */
export function TaskList({
  tasks,
  detail = "plan",
  keepOrder,
  onEdit,
  meta,
}: {
  tasks: PlannerTask[];
  detail?: Detail;
  keepOrder?: boolean;
  onEdit: (task: PlannerTask) => void;
  meta?: (task: PlannerTask) => string | undefined;
}) {
  const planner = usePlanner();
  const [removing, setRemoving] = useState<PlannerTask | null>(null);
  const ordered = keepOrder ? tasks : openFirst(tasks);
  return (
    <>
      <ul className="tasks" data-detail={detail}>
        {ordered.map((task) => {
          const extra = meta?.(task);
          return (
            <li key={task.id} className="task" data-done={task.isComplete || undefined}>
              <Checkbox
                checked={task.isComplete}
                label={`${task.isComplete ? "Reopen" : "Complete"}: ${task.content}`}
                onChange={() => void planner.toggleTask(task)}
              />
              <button type="button" className="task-body" onClick={() => onEdit(task)} aria-label={`Edit: ${task.content}`}>
                <span className="task-title">{task.content}</span>
                {detail === "plan" && task.noteTitle ? <span className="task-meta">Note: {task.noteTitle}</span> : null}
                {detail === "plan" && task.label ? <span className="task-meta">Goal: {task.label}</span> : null}
                {detail === "context" ? <span className="task-meta">{taskContext(task)}</span> : null}
                {detail === "goal" ? (
                  <span className="task-meta task-meta--row">
                    <span>{taskWhen(task)}</span>
                    {extra ? <span className="task-tag">{extra}</span> : null}
                    {task.noteTitle ? <span>Note: {task.noteTitle}</span> : null}
                    <PriorityMark value={task.priority} />
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className="task-remove ot-round ot-round--plain"
                aria-label={`Remove: ${task.content}`}
                data-tip="Remove"
                data-tip-align="end"
                onClick={() => setRemoving(task)}
              >
                <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      <Confirm
        open={!!removing}
        title="Remove task"
        message="Are you sure you want to delete this task?"
        confirmLabel="Delete"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const task = removing;
          setRemoving(null);
          if (task) void planner.removeTask(task).catch(() => undefined);
        }}
      />
    </>
  );
}
