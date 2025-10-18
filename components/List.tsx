import React, { useContext } from "react";
import { updateTask } from "../backend";
import { CheckIcon } from "../icons";
import { useTheme } from "next-themes";
import { useDate } from "../hooks/useDate";
import { AppState } from "../localState";

type TListProps = {
  task: any;
  openHandler: Function;
  statusHandler: Function;
  date?: any;
};

export const List = ({ task, openHandler }: TListProps) => {
  const { theme } = useTheme();
  const { yesterday } = useDate();
  const { appState } = useContext(AppState);

  const updateStatus = () => {
    const currentTargetGroup = task.target_group ?? "today";

    updateTask(
      task.id,
      task.content,
      !task.isComplete,
      task.priority,
      currentTargetGroup,
      task.date
    );

    appState?.refreshTasks?.();
  };

  return (
    <div className="flex w-full flex-1 items-start gap-2">
      <button
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center ${
          task.isComplete
            ? theme === "dark"
              ? "bg-cyan-600 text-zinc-900"
              : "bg-sky-500 text-white"
            : theme === "dark"
            ? "border border-zinc-600 bg-transparent"
            : "border border-zinc-300 bg-white"
        } transition`}
        onClick={updateStatus}
        aria-label={task.isComplete ? "Mark as active" : "Mark as complete"}
      >
        {task.isComplete ? (
          <CheckIcon />
        ) : null}
      </button>

      <button
        onClick={() => openHandler(task)}
        className={`flex-1 text-left text-base font-normal leading-snug ${
          theme === "dark" ? "text-zinc-50" : "text-zinc-900"
        } ${task.isComplete ? "line-through opacity-50" : ""} ${
          task.date < yesterday && !task.isComplete
            ? "text-red-400"
            : ""
        }`}
      >
        {task.content}
      </button>
    </div>
  );
};
