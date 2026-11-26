import { useState, type ReactNode } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { openFirst, type PlannerTask } from "./model";
import { taskContext, taskWhen } from "./search";
import { usePlanner } from "./store";
import { Checkbox, Confirm, PriorityMark } from "./ui";

type Detail = "plan" | "goal" | "context";
type MoveAction = (task: PlannerTask, trigger: HTMLButtonElement) => void;

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
  onMove,
}: {
  tasks: PlannerTask[];
  detail?: Detail;
  keepOrder?: boolean;
  onEdit: (task: PlannerTask) => void;
  meta?: (task: PlannerTask) => string | undefined;
  onMove?: MoveAction;
}) {
  const planner = usePlanner();
  const [removing, setRemoving] = useState<PlannerTask | null>(null);
  const ordered = keepOrder ? tasks : openFirst(tasks);
  return (
    <>
      <ul className="tasks" data-detail={detail}>
        {ordered.map((task) => {
          const extra = meta?.(task);
          const moving = planner.movingTaskId === task.id;
          return (
            <TaskRow key={task.id} task={task} onMove={onMove} moveDisabled={!!planner.movingTaskId} moving={moving}>
              <Checkbox
                checked={task.isComplete}
                label={`${task.isComplete ? "Reopen" : "Complete"}: ${task.content}`}
                onChange={() => void planner.toggleTask(task)}
                disabled={moving}
              />
              <button type="button" className="task-body" onClick={() => onEdit(task)} aria-label={`Edit: ${task.content}`} disabled={moving}>
                <span className="task-title">{task.content}</span>
                {detail === "plan" && task.noteTitle ? <span className="task-meta">Note: {task.noteTitle}</span> : null}
                {detail === "plan" && task.label ? <span className="task-meta">Goal: {task.label}</span> : null}
                {detail === "plan" && extra ? <span className="task-meta">{extra}</span> : null}
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
                disabled={moving}
                onClick={() => setRemoving(task)}
              >
                <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </TaskRow>
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

function TaskRow({ task, onMove, moveDisabled, moving, children }: {
  task: PlannerTask;
  onMove?: MoveAction;
  moveDisabled: boolean;
  moving: boolean;
  children: ReactNode;
}) {
  const attributes = { className: "task", "data-done": task.isComplete || undefined };
  if (!onMove) return <li {...attributes}>{children}</li>;
  return (
    <DraggableTaskRow task={task} onMove={onMove} disabled={moveDisabled} moving={moving}>
      {children}
    </DraggableTaskRow>
  );
}

function DraggableTaskRow({ task, onMove, disabled, moving, children }: {
  task: PlannerTask;
  onMove: MoveAction;
  disabled: boolean;
  moving: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: task.id, disabled });
  return (
    <li
      ref={setNodeRef}
      className="task"
      data-done={task.isComplete || undefined}
      data-dragging={isDragging || undefined}
      data-moving={moving || undefined}
      onPointerDown={(event) => {
        if (event.pointerType !== "touch" && event.target instanceof Element && event.target.closest(".task-body"))
          listeners?.onPointerDown?.(event);
      }}
    >
      {children}
      <button
        type="button"
        className="task-move"
        aria-label={`Move: ${task.content}`}
        aria-haspopup="dialog"
        data-tip="Move task"
        data-tip-align="start"
        disabled={disabled}
        onPointerDown={(event) => listeners?.onPointerDown?.(event)}
        onClick={(event) => onMove(task, event.currentTarget)}
      >
        <GripVertical size={12} aria-hidden="true" />
      </button>
    </li>
  );
}
