import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCheck, ChevronRight, Flag } from "lucide-react";
import { TaskList } from "./TaskList";
import { today } from "./dates";
import { type PlannerTask } from "./model";
import { PlannerStatus } from "./PlanPages";
import { usePlanner } from "./store";
import { Empty, Segmented } from "./ui";

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CompletionRing({ completed, total }: { completed: number; total: number }) {
  const ratio = total ? Math.min(1, Math.max(0, completed / total)) : 0;
  // Start empty so the ring draws itself in once.
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(ratio));
    return () => cancelAnimationFrame(frame);
  }, [ratio]);
  return (
    <div
      className="stats-ring"
      role="img"
      aria-label={total ? `${completed} of ${total} tasks completed, ${Math.round(ratio * 100)} percent` : "No tasks yet"}
    >
      <svg width="108" height="108" viewBox="0 0 108 108" aria-hidden="true">
        <circle cx="54" cy="54" r={RADIUS} fill="none" stroke="var(--ot-ring-track)" strokeWidth="9" />
        {ratio > 0 ? (
          <circle
            cx="54"
            cy="54"
            r={RADIUS}
            fill="none"
            stroke="var(--ot-ring)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={CIRCUMFERENCE * (1 - drawn)}
            transform="rotate(-90 54 54)"
          />
        ) : null}
      </svg>
      <p aria-hidden="true">
        <strong>{total ? `${Math.round(ratio * 100)}%` : "—"}</strong>
        <span>{total ? "done" : "no tasks"}</span>
      </p>
    </div>
  );
}

const confetti = ["🎉", "✨", "🥳", "⭐️", "🙌", "🎊"];

/** A short burst of emoji; a plain "Nice work" when motion is reduced. */
function Celebration({ run }: { run: number }) {
  const [pieces, setPieces] = useState<{ id: string; emoji: string; left: number; delay: number; drift: number; size: number }[]>([]);
  const [still, setStill] = useState(false);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      const timer = window.setTimeout(() => setStill(false), 1750);
      return () => window.clearTimeout(timer);
    }
    setPieces(
      Array.from({ length: 22 }, (_, index) => ({
        id: `${run}-${index}`,
        emoji: confetti[index % confetti.length],
        left: 6 + Math.random() * 88,
        delay: Math.random() * 320,
        drift: (Math.random() - 0.5) * 9,
        size: 1.1 + Math.random() * 0.9,
      })),
    );
    const timer = window.setTimeout(() => setPieces([]), 2200);
    return () => window.clearTimeout(timer);
  }, [run]);
  if (still)
    return (
      <p className="stats-nice" role="status">
        🎉 Nice work
      </p>
    );
  if (!pieces.length) return null;
  return (
    <div className="stats-burst" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          style={
            {
              left: `${piece.left}%`,
              fontSize: `${piece.size}rem`,
              animationDelay: `${piece.delay}ms`,
              "--drift": `${piece.drift}rem`,
            } as React.CSSProperties
          }
        >
          {piece.emoji}
        </span>
      ))}
    </div>
  );
}

export function StatisticsPage({
  onEdit,
  onGoal,
}: {
  onEdit: (task: PlannerTask) => void;
  /** Opens one goal, or the Goals page when no name is given. */
  onGoal: (name?: string) => void;
}) {
  const planner = usePlanner();
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [celebration, setCelebration] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const greeted = useRef(false);

  const completed = useMemo(
    () =>
      planner.tasks
        .filter((task) => task.isComplete)
        .sort((left, right) => ((left.completed_at ?? left.date ?? "") < (right.completed_at ?? right.date ?? "") ? 1 : -1)),
    [planner.tasks],
  );
  const open = useMemo(() => {
    const now = today();
    return planner.tasks
      .filter((task) => !task.isComplete)
      .sort((left, right) => {
        const leftPast = Boolean(left.date && left.date < now);
        const rightPast = Boolean(right.date && right.date < now);
        return leftPast !== rightPast ? Number(rightPast) - Number(leftPast) : right.priority - left.priority;
      });
  }, [planner.tasks]);
  const goals = planner.summaries.filter((goal) => goal.total > 0);
  const finishedGoals = goals.filter((goal) => goal.total === goal.completed).length;

  // A small celebration greets finished work once per visit.
  useEffect(() => {
    if (!planner.loaded || greeted.current || !completed.length) return;
    greeted.current = true;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setCelebration((value) => value + 1);
  }, [planner.loaded, completed.length]);

  const shown = tab === "open" ? open : completed;
  return (
    <div className="page page--stats">
      <h1 className="page-title">Statistics</h1>
      {!planner.loaded ? (
        <PlannerStatus />
      ) : (
        <>
          <section className="stats-card" aria-label="All-time progress">
            <CompletionRing completed={completed.length} total={planner.tasks.length} />
            <div className="stats-legend">
              <h2>All-time progress</h2>
              <p>{completed.length} completed</p>
              <p className="stats-muted">{open.length} open</p>
              <button
                type="button"
                className="stats-celebrate"
                aria-label="Celebrate progress"
                disabled={!completed.length}
                onClick={() => {
                  setAnnouncement(`Nice work. ${completed.length} tasks completed.`);
                  setCelebration((value) => value + 1);
                }}
              >
                <span aria-hidden="true">🎉</span> Celebrate
              </button>
            </div>
          </section>
          <p className="ot-visually-hidden" role="status">
            {announcement}
          </p>

          <section className="stats-goals" aria-label="Goals">
            <header>
              <h2>Goals</h2>
              {goals.length ? (
                <span>
                  {finishedGoals}/{goals.length} complete
                </span>
              ) : null}
              <button type="button" aria-label="View all goals" onClick={() => onGoal()}>
                View all <ChevronRight size={13} aria-hidden="true" />
              </button>
            </header>
            {goals.length ? (
              <ul>
                {goals.slice(0, 3).map((goal) => (
                  <li key={goal.name}>
                    <button
                      type="button"
                      aria-label={`Goal ${goal.name}, ${goal.completed} of ${goal.total} completed`}
                      onClick={() => onGoal(goal.name)}
                    >
                      <Flag size={16} strokeWidth={1.7} aria-hidden="true" />
                      <span>
                        <span className="stats-goal-line">
                          <strong>{goal.name}</strong>
                          <em>
                            {goal.completed}/{goal.total}
                          </em>
                        </span>
                        <span className="ot-progress">
                          <i style={{ width: `${(goal.completed / goal.total) * 100}%` }} />
                        </span>
                      </span>
                      <ChevronRight size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="stats-muted stats-none">No tasks in goals yet</p>
            )}
          </section>

          <section className="plan" aria-label={tab === "open" ? "Open tasks" : "Completed tasks"}>
            <header className="stats-filter">
              <Segmented
                label="Tasks shown"
                options={[
                  { value: "open", label: "Open" },
                  { value: "closed", label: "Completed" },
                ]}
                value={tab}
                onChange={setTab}
              />
              <span aria-label={`${shown.length} tasks`}>{shown.length}</span>
            </header>
            {shown.length ? (
              <TaskList tasks={shown} detail="context" keepOrder onEdit={onEdit} />
            ) : (
              <Empty icon={CheckCheck}>{tab === "open" ? "All clear" : "No completed tasks yet"}</Empty>
            )}
          </section>
        </>
      )}
      <Celebration run={celebration} />
    </div>
  );
}
