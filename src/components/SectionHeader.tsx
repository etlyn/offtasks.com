import React from "react";
import { Plus } from "lucide-react";
import type { Task, TaskGroup } from "@/types";

interface SectionHeaderProps {
  headline: string;
  onClickAdd: (task: Task | null, group?: TaskGroup) => void;
  progressData: {
    completedTasks: number;
    allTasks: number;
  };
  showCounter: boolean;
  showAddButton?: boolean;
}

export const SectionHeader = ({
  headline,
  onClickAdd,
  progressData,
  showCounter,
  showAddButton = true,
}: SectionHeaderProps) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center text-base font-semibold text-zinc-900 dark:text-zinc-100">
      <h2>{headline}</h2>
      <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
        {showCounter
          ? `${progressData.completedTasks} of ${progressData.allTasks}`
          : progressData.allTasks}
      </span>
    </div>

    {showAddButton ? (
      <button
        className="flex items-center gap-2 text-sm font-semibold text-sky-600 transition hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:text-cyan-400 dark:hover:text-cyan-300 dark:focus:ring-cyan-400"
        onClick={() => onClickAdd(null)}
        type="button"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span>Add Task</span>
      </button>
    ) : null}
  </div>
);
