import React, { useMemo } from "react";
import { AlertTriangle, BarChart3, Calendar, Layers } from "lucide-react";
import type { DashboardTask } from "@/components/dashboard/types";

interface AnalyticsPanelProps {
  today: DashboardTask[];
  tomorrow: DashboardTask[];
  upcoming: DashboardTask[];
  completed: DashboardTask[];
}

const buildSummary = ({ today, tomorrow, upcoming, completed }: AnalyticsPanelProps) => {
  const totalActive = today.concat(tomorrow, upcoming).filter((task) => !task.completed).length;
  const overdueCount = today.concat(tomorrow, upcoming).filter((task) => task.overdue && !task.completed).length;
  return {
    totalTasks: today.length + tomorrow.length + upcoming.length + completed.length,
    completedTasks: completed.length,
    activeTasks: totalActive,
    overdueTasks: overdueCount,
    distribution: {
      today: today.length,
      tomorrow: tomorrow.length,
      upcoming: upcoming.length,
    },
  };
};

export const AnalyticsPanel = (props: AnalyticsPanelProps) => {
  const summary = useMemo(() => buildSummary(props), [props]);
  const completionRate = summary.totalTasks
    ? Math.round((summary.completedTasks / summary.totalTasks) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Analytics</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Snapshot of how things are progressing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_24px_60px_rgba(59,130,246,0.12)] dark:border-zinc-700/60 dark:bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-sky-500" />
            <span className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Completion Rate
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">{completionRate}%</p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800/80">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            {summary.completedTasks} completed of {summary.totalTasks} total tasks.
          </p>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_24px_60px_rgba(59,130,246,0.12)] dark:border-zinc-700/60 dark:bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-amber-500" />
            <span className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Active Tasks
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">{summary.activeTasks}</p>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Still waiting to be completed.
          </p>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_24px_60px_rgba(59,130,246,0.12)] dark:border-zinc-700/60 dark:bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Overdue
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">{summary.overdueTasks}</p>
          <p className="mt-3 text-xs text-red-500 dark:text-red-400">
            Prioritise overdue tasks to stay on track.
          </p>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_24px_60px_rgba(59,130,246,0.12)] dark:border-zinc-700/60 dark:bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Distribution
            </span>
          </div>
          <ul className="mt-4 space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
            <li>
              Today • <span className="font-semibold text-zinc-900 dark:text-zinc-100">{summary.distribution.today}</span>
            </li>
            <li>
              Tomorrow • <span className="font-semibold text-zinc-900 dark:text-zinc-100">{summary.distribution.tomorrow}</span>
            </li>
            <li>
              Upcoming • <span className="font-semibold text-zinc-900 dark:text-zinc-100">{summary.distribution.upcoming}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
