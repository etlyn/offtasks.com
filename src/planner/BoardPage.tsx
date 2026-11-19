import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DndContext, DragOverlay, PointerSensor, pointerWithin, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Bookmark, Calendar, Check, GripVertical, Plus, Sun, X, type LucideIcon } from "lucide-react";
import { PlanHeading, PlannerStatus } from "./PlanPages";
import { TaskList } from "./TaskList";
import { shiftDay, shortDate, weekdayDate } from "./dates";
import { boardTasks, type BoardColumn, type PlannerTask } from "./model";
import { usePlanner } from "./store";
import { Empty, Sheet } from "./ui";

const columns = [
  { id: "today", label: "Today", icon: Sun, empty: "Nothing planned for today" },
  { id: "tomorrow", label: "Tomorrow", icon: Calendar, empty: "Nothing planned for tomorrow" },
  { id: "later", label: "Later", icon: Bookmark, empty: "Nothing in Later" },
] as const;

export function BoardPage({ onAdd, onEdit, startInLater }: {
  onAdd: (date: string | null) => void;
  onEdit: (task: PlannerTask) => void;
  startInLater: boolean;
}) {
  const planner = usePlanner();
  const grouped = boardTasks(planner.tasks, planner.day);
  const dates = { today: planner.day, tomorrow: shiftDay(planner.day, 1), later: null };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [dragId, setDragId] = useState<string | null>(null);
  const dragTask = planner.tasks.find((task) => task.id === dragId);
  const [choosing, setChoosing] = useState<PlannerTask | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const board = useRef<HTMLDivElement>(null);
  const moveOptions = useRef<HTMLDivElement>(null);
  const moveTrigger = useRef<HTMLButtonElement | null>(null);
  const moveDestination = useRef<BoardColumn | null>(null);

  useEffect(() => {
    if (startInLater && planner.loaded) board.current?.querySelector("#board-later")?.scrollIntoView({ block: "nearest" });
  }, [startInLater, planner.loaded]);

  const move = async (task: PlannerTask, destination: BoardColumn) => {
    setAnnouncement("");
    if (await planner.moveTask(task, dates[destination])) {
      const label = columns.find((column) => column.id === destination)?.label;
      setAnnouncement(`${task.content} moved to ${label}.`);
    }
  };

  const drop = ({ active, over }: DragEndEvent) => {
    setDragId(null);
    const destination = columns.find((column) => column.id === over?.id);
    if (!destination || grouped[destination.id].some((task) => task.id === active.id)) return;
    const task = planner.tasks.find((item) => item.id === active.id);
    if (task) void move(task, destination.id);
  };

  const choose = (task: PlannerTask, trigger: HTMLButtonElement) => {
    moveTrigger.current = trigger;
    moveDestination.current = null;
    setChoosing(task);
  };

  const pickColumn = (id: BoardColumn) => {
    if (!choosing) return;
    moveDestination.current = id;
    void move(choosing, id);
    setChoosing(null);
  };

  return (
    <div className="page page--board" ref={board} tabIndex={-1}>
      <h1 className="board-title">Board</h1>
      {planner.loaded ? (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          accessibility={{
            announcements: {
              onDragStart: () => undefined,
              onDragOver: () => undefined,
              onDragEnd: () => undefined,
              onDragCancel: () => undefined,
            },
          }}
          onDragStart={({ active }) => setDragId(String(active.id))}
          onDragCancel={() => setDragId(null)}
          onDragEnd={drop}
        >
          <div className="board-columns">
            {columns.map(({ id, label, icon, empty }) => (
              <DayColumn
                key={id}
                id={id}
                label={label}
                date={dates[id]}
                tasks={grouped[id]}
                icon={icon}
                empty={empty}
                onAdd={onAdd}
                onEdit={onEdit}
                onMove={choose}
              />
            ))}
          </div>
          {createPortal(<DragOverlay dropAnimation={null} zIndex={35}>
            {dragTask ? (
              <div className="board-drag-preview" aria-hidden="true">
                <span>{dragTask.content}</span>
                <GripVertical size={16} />
              </div>
            ) : null}
          </DragOverlay>, document.body)}
        </DndContext>
      ) : <PlannerStatus />}

      <Sheet
        open={!!choosing}
        onClose={() => setChoosing(null)}
        title="Move task"
        size="small"
        onOpenAutoFocus={(event) => {
          const option = moveOptions.current?.querySelector<HTMLButtonElement>("button:enabled");
          if (option) {
            event.preventDefault();
            option.focus();
          }
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const trigger = moveTrigger.current;
          if (trigger?.isConnected) trigger.focus({ preventScroll: true });
          else {
            const target = board.current?.querySelector<HTMLElement>(`#board-${moveDestination.current}`);
            (target ?? board.current)?.focus();
          }
        }}
      >
        <header className="sheet-head">
          <button type="button" className="ot-round ot-round--plain" aria-label="Close" onClick={() => setChoosing(null)}>
            <X size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <h2>Move task</h2>
          <span className="sheet-head-spacer" />
        </header>
        <div className="board-move-options" ref={moveOptions}>
          {columns.map(({ id, label, icon: Icon }) => {
            const current = grouped[id].some((task) => task.id === choosing?.id);
            const date = dates[id];
            return (
              <button key={id} type="button" aria-current={current || undefined} onClick={() => pickColumn(id)} disabled={current || !!planner.movingTaskId}>
                <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
                <span>{label}</span>
                <small>{date ? weekdayDate(date) : "No date"}</small>
                {current ? <Check size={16} strokeWidth={1.8} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </Sheet>
      <span className="ot-visually-hidden" role="status">{announcement}</span>
    </div>
  );
}

function DayColumn({ id, label, date, tasks, icon, empty, onAdd, onEdit, onMove }: {
  id: BoardColumn;
  label: string;
  date: string | null;
  tasks: PlannerTask[];
  icon: LucideIcon;
  empty: string;
  onAdd: (date: string | null) => void;
  onEdit: (task: PlannerTask) => void;
  onMove: (task: PlannerTask, trigger: HTMLButtonElement) => void;
}) {
  const { active, isOver, setNodeRef } = useDroppable({ id });
  const target = isOver && active && !tasks.some((task) => task.id === active.id);
  return (
    <section ref={setNodeRef} id={`board-${id}`} className="board-column" tabIndex={-1} aria-label={label} data-drop-target={target || undefined}>
      <PlanHeading title={label} tasks={tasks} level="h2">
        {date ? <time dateTime={date}>{shortDate(date)}</time> : null}
        <button type="button" className="ot-round ot-round--plain" aria-label={`Add task to ${label}`} data-tip={`Add to ${label}`} data-tip-align="end" onClick={() => onAdd(date)}>
          <Plus size={17} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </PlanHeading>
      <div className="board-column-body">
        {tasks.length > 0 ? (
          <TaskList
            tasks={tasks}
            onEdit={onEdit}
            onMove={onMove}
            meta={id === "later" ? (task) => task.date ? weekdayDate(task.date) : undefined : undefined}
          />
        ) : <Empty icon={icon}>{empty}</Empty>}
      </div>
    </section>
  );
}
