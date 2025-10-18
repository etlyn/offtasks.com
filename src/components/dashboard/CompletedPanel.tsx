import React from "react";
import { CheckCircle } from "lucide-react";
import type { DashboardTask } from "@/components/dashboard/types";

interface CompletedPanelProps {
  tasks: DashboardTask[];
}

const formatDate = (raw: string) => {
  if (!raw) {
    return "Recently";
  }
  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) {
    return "Recently";
  }
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const CompletedPanel = ({ tasks }: CompletedPanelProps) => {
  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/60 bg-white/80 px-10 py-16 text-center shadow-[0_24px_60px_rgba(99,102,241,0.12)] backdrop-blur-2xl dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <CheckCircle className="h-12 w-12 text-zinc-400 dark:text-zinc-600" />
        <div>
          <h3 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">No completed tasks yet</h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Finish a task to celebrate it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <article
          key={task.id}
          className="flex items-start justify-between gap-4 rounded-3xl border border-white/60 bg-white/85 px-6 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-700/60 dark:bg-zinc-900/70"
        >
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-500 dark:bg-sky-500/20 dark:text-sky-300">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[15px] font-medium text-zinc-700 line-through decoration-zinc-400 dark:text-zinc-200">
                {task.text}
              </p>
              <div className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">Completed on {formatDate(task.date)}</div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};
