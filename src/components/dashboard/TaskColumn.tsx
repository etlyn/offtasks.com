import React from "react";
import type { DashboardTask } from "@/components/dashboard/types";
import { TaskItem } from "@/components/dashboard/TaskItem";

interface TaskColumnProps {
  title: string;
  tasks: DashboardTask[];
  onToggle: (task: DashboardTask) => void;
  onEdit: (task: DashboardTask) => void;
  emptyMessage?: string;
  showPriority?: boolean;
}

export const TaskColumn = ({
  title,
  tasks,
  onToggle,
  onEdit,
  emptyMessage = "No tasks yet.",
  showPriority = false,
}: TaskColumnProps) => {
  const completedCount = tasks.filter((task) => task.completed).length;
  const totalCount = tasks.length;

  return (
    <section className="flex min-h-[320px] flex-col gap-6 rounded-3xl border border-white/50 bg-white/80 px-6 py-6 shadow-[0_24px_60px_rgba(59,130,246,0.12)] backdrop-blur-xl transition-colors duration-300 dark:border-zinc-700/50 dark:bg-zinc-900/60">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {completedCount} of {totalCount}
          </p>
        </div>
      </header>

      <div className="scrollbar-hide flex flex-1 flex-col gap-4 overflow-y-auto pb-2">
        {tasks.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200/80 bg-white/60 p-6 text-center text-sm text-zinc-400 dark:border-zinc-700/60 dark:bg-zinc-900/30 dark:text-zinc-500">
            {emptyMessage}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onEdit={onEdit}
              showPriorityBadge={showPriority}
            />
          ))
        )}
      </div>
    </section>
  );
};
