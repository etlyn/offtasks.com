import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { NavIcon } from "@/planner/ui";
import "@/styles/planner.css";

const week = ["M", "T", "W", "T", "F", "S", "S"];
// A fixed sample month keeps the picture the same on every visit.
const days = [
  [28, 29, 30, 1, 2, 3, 4],
  [5, 6, 7, 8, 9, 10, 11],
  [12, 13, 14, 15, 16, 17, 18],
  [19, 20, 21, 22, 23, 24, 25],
  [26, 27, 28, 29, 30, 31, 1],
];
const marked = new Set(["1-3", "2-5", "3-3"]);
const tasks = [
  { title: "Make room for a walk", done: false },
  { title: "Practice for ten minutes", done: false, meta: "Note: A calmer week" },
  { title: "Read a few pages", done: true, meta: "Goal: Grow a little" },
];

/**
 * A still picture of the planner's Calendar page, drawn with the planner's own
 * styles so the landing page always shows the product as it really looks.
 */
export const PlannerPreview = () => (
  <div className="preview" role="img" aria-label="The Offtasks planner: a month calendar beside today's tasks">
    <div className="preview-top" aria-hidden="true">
      <span className="ot-wordmark">
        offtasks<i>.</i>
      </span>
      <span className="preview-avatar">AM</span>
    </div>
    <div className="preview-body" aria-hidden="true">
      <div className="cal ot-glass">
        <div className="cal-toolbar">
          <span className="preview-chevron">
            <ChevronLeft size={18} strokeWidth={1.8} />
          </span>
          <span className="cal-title">October 2026</span>
          <span className="preview-chevron">
            <ChevronRight size={18} strokeWidth={1.8} />
          </span>
        </div>
        <div className="cal-weekdays">
          {week.map((name, index) => (
            <span key={index}>{name}</span>
          ))}
        </div>
        <div className="cal-grid">
          {days.map((row, weekIndex) => (
            <div key={weekIndex} role="presentation">
              {row.map((value, column) => {
                const outside = (weekIndex === 0 && value > 7) || (weekIndex === 4 && value < 7);
                const selected = weekIndex === 1 && column === 2;
                return (
                  <span
                    key={column}
                    data-cell=""
                    data-outside={outside || undefined}
                    data-selected={selected || undefined}
                    data-marked={marked.has(`${weekIndex}-${column}`) || selected || undefined}
                  >
                    <span>{value}</span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="plan">
        <div className="plan-head">
          <strong>Today</strong>
          <span>1/3</span>
        </div>
        <ul className="tasks">
          {tasks.map((task) => (
            <li key={task.title} className="task" data-done={task.done || undefined}>
              <span className="ot-check" aria-checked={task.done}>
                <i>
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7.4 5.9 10.2 11 4.4" />
                  </svg>
                </i>
              </span>
              <span className="task-body">
                <span className="task-title">{task.title}</span>
                {task.meta ? <span className="task-meta">{task.meta}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
    <div className="preview-footer" aria-hidden="true">
      <div className="pl-dock ot-glass">
        {(["board", "calendar", "tags", "goals"] as const).map((name) => (
          <span key={name} data-current={name === "calendar" || undefined}>
            <NavIcon name={name} selected={name === "calendar"} />
            {name[0].toUpperCase() + name.slice(1)}
          </span>
        ))}
      </div>
      <span className="pl-plus"><Plus size={19} strokeWidth={1.8} /></span>
    </div>
  </div>
);
