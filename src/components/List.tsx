import React, { useContext } from "react";
import { Check } from "lucide-react";
import { updateTask } from "@/lib/supabase";
import { useDate } from "@/hooks/useDate";
import { AppStateContext } from "@/providers/app-state";
import type { Task, TaskGroup } from "@/types";

interface ListProps {
  task: Task;
  openHandler: (task: Task | null, group?: TaskGroup) => void;
}

export const List = ({ task, openHandler }: ListProps) => {
  const { yesterday } = useDate();
  const { appState } = useContext(AppStateContext);

  const updateStatus = async () => {
    const currentTargetGroup = task.target_group ?? "today";

    await updateTask(
      task.id,
      task.content,
      !task.isComplete,
      task.priority,
      currentTargetGroup,
      task.date
    );

    if (appState?.refreshTasks) {
      await appState.refreshTasks();
    }
  };

  const isOverdue = task.date < yesterday && !task.isComplete;

  return (
    <div className="flex w-full flex-1 items-start gap-2">
      <button
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded transition ${
          task.isComplete
            ? "bg-sky-500 text-white dark:bg-cyan-600 dark:text-zinc-900"
            : "border border-zinc-300 bg-white text-transparent hover:border-sky-400 dark:border-zinc-600 dark:bg-transparent"
        }`}
        onClick={updateStatus}
        aria-label={task.isComplete ? "Mark as active" : "Mark as complete"}
      >
        {task.isComplete ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
      </button>

      <button
        onClick={() => openHandler(task)}
        className={`flex-1 text-left text-base leading-snug text-zinc-900 transition hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-200 ${
          task.isComplete ? "line-through opacity-50" : ""
        } ${isOverdue ? "text-red-500 dark:text-red-400" : ""}`}
      >
        {task.content}
      </button>
    </div>
  );
};
