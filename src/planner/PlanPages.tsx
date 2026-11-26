import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, RotateCcw } from "lucide-react";
import { MonthCalendar } from "./MonthCalendar";
import { TagFilter } from "./TagControls";
import { TaskList } from "./TaskList";
import { headingForDay, today } from "./dates";
import { scheduledDay, tasksForDay, type PlannerTask } from "./model";
import { usePlanner } from "./store";
import { filterByTag } from "./tags";
import { Empty, Loader } from "./ui";

/** A heading with a done/total count beside it, as "Today 1/3". */
export function PlanHeading({
  title,
  tasks,
  level = "h1",
  children,
}: {
  title: string;
  tasks: PlannerTask[];
  level?: "h1" | "h2";
  children?: ReactNode;
}) {
  const done = tasks.filter((task) => task.isComplete).length;
  const Heading = level;
  return (
    <header className="plan-head">
      <Heading>{title}</Heading>
      {tasks.length ? (
        <span aria-label={`${done} of ${tasks.length} tasks completed`}>
          {done}/{tasks.length}
        </span>
      ) : null}
      <div className="plan-head-tools">{children}</div>
    </header>
  );
}

/** What a list shows before its first load finishes, or when that load failed. */
export function PlannerStatus() {
  const planner = usePlanner();
  if (planner.loaded) return null;
  if (planner.error)
    return (
      <div className="plan-status" role="alert">
        <p>{planner.error}</p>
        <button type="button" className="ot-button ot-button--soft ot-button--small" onClick={() => void planner.refresh()}>
          Retry
        </button>
      </div>
    );
  return (
    <div className="plan-status">
      <Loader label="Loading your planner" />
    </div>
  );
}

export function CalendarPage({
  day,
  onDay,
  onEdit,
  narrow,
  tagId,
  onTag,
}: {
  day: string;
  onDay: (day: string) => void;
  onEdit: (task: PlannerTask) => void;
  narrow: boolean;
  tagId: string;
  onTag: (id: string) => void;
}) {
  const planner = usePlanner();
  const [expanded, setExpanded] = useState(true);
  const visible = useMemo(() => filterByTag(planner.tasks, planner.tagging, tagId), [planner.tasks, planner.tagging, tagId]);
  const marked = useMemo(
    () => new Set(visible.map((task) => scheduledDay(task, planner.day)).filter((value): value is string => !!value)),
    [planner.day, visible],
  );
  const tasks = tasksForDay(visible, day, planner.day);
  return (
    <div className="page page--calendar">
      <div className="page-calendar">
        <MonthCalendar
          day={day}
          onChange={onDay}
          markedDays={marked}
          expanded={expanded}
          onExpandedChange={setExpanded}
          collapsible={narrow}
        />
      </div>
      <section className="plan" aria-label={headingForDay(day)}>
        <PlanHeading title={headingForDay(day)} tasks={tasks}>
          <TagFilter tags={planner.tagging.tags} value={tagId} onChange={onTag} />
          {day !== today() ? (
            <button
              type="button"
              className="ot-round ot-round--plain plan-reset"
              aria-label="Go to today"
              data-tip="Today"
              data-tip-align="end"
              onClick={() => onDay(today())}
            >
              <RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" />
            </button>
          ) : null}
        </PlanHeading>
        {!planner.loaded ? (
          <PlannerStatus />
        ) : tasks.length ? (
          <TaskList tasks={tasks} onEdit={onEdit} />
        ) : (
          <Empty icon={CalendarDays} card>
            {tagId ? "No tasks with this tag" : "No tasks planned"}
          </Empty>
        )}
      </section>
    </div>
  );
}
