import React from "react";
import { Check } from "lucide-react";
import type { DashboardTask } from "@/components/dashboard/types";

interface TaskItemProps {
  task: DashboardTask;
  onToggle: (task: DashboardTask) => void;
  onEdit: (task: DashboardTask) => void;
  showPriorityBadge?: boolean;
}

const PRIORITY_STYLES: Record<DashboardTask["priority"], { label: string; accent: string }> = {
  high: { label: "High", accent: "text-red-500" },
  medium: { label: "Medium", accent: "text-amber-500" },
  low: { label: "Low", accent: "text-sky-500" },
};

export const TaskItem = ({ task, onToggle, onEdit, showPriorityBadge = false }: TaskItemProps) => {
  const { completed, overdue, priority, text } = task;
  const priorityMeta = PRIORITY_STYLES[priority];

  return (
    <div className="group flex items-start gap-3 rounded-2xl border border-transparent bg-white/70 px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200/80 hover:shadow-md dark:bg-zinc-900/40 dark:hover:border-sky-500/40">
      <button
        type="button"
        onClick={() => onToggle(task)}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 ${
          completed
            ? "border-sky-500 bg-sky-500 text-white shadow-[0_8px_20px_rgba(56,189,248,0.35)]"
            : "border-zinc-200 bg-white text-transparent hover:border-sky-400 hover:text-sky-500 dark:border-zinc-700 dark:bg-zinc-900"
        } ${overdue && !completed ? "border-red-400 text-red-500" : ""}`}
        aria-label={completed ? "Mark as active" : "Mark as complete"}
      >
        <Check className={`h-4 w-4 ${completed ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => onEdit(task)}
        className={`flex flex-1 flex-col text-left transition ${
          completed
            ? "text-zinc-400 line-through"
            : overdue
            ? "text-red-500"
            : "text-zinc-800 dark:text-zinc-100"
        }`}
      >
        <span className="text-[15px] leading-snug">{text}</span>
        {showPriorityBadge ? (
          <span className={`mt-1 text-xs font-medium ${priorityMeta.accent}`}>
            {priorityMeta.label}
          </span>
        ) : null}
        {overdue && !completed ? (
          <span className="mt-1 text-xs font-medium text-red-400">Overdue</span>
        ) : null}
      </button>
    </div>
  );
};
