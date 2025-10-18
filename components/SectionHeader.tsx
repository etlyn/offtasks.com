import { useTheme } from "next-themes";
import React from "react";
import { AddIcon } from "../icons";

type TSectionHeader = {
  headline: string;
  onClickAdd: Function;
  progressData: any;
  showCounter: boolean;
  showAddButton?: boolean;
};

export const SectionHeader = ({
  headline,
  onClickAdd,
  progressData,
  showCounter,
  showAddButton = true,
}: TSectionHeader) => {
  const { theme } = useTheme();

  return (
    <div className="flex flex-row items-center justify-between">
      <div
        className={`flex flex-row text-base font-semibold ${
          theme === "dark" ? "text-zinc-50" : "text-zinc-900"
        }`}
      >
        <h1>{headline}</h1>
        {showCounter ? (
          <h1 className="font-normal">
            &nbsp;- {progressData.completedTasks} of {progressData.allTasks}
          </h1>
        ) : (
          <h1 className="font-normal">&nbsp;- {progressData.allTasks}</h1>
        )}
      </div>

      {showAddButton && (
        <button
          className={`flex flex-row items-center gap-2 text-sm font-semibold transition ${
            theme === "dark"
              ? "text-cyan-600 hover:text-cyan-500"
              : "text-sky-500 hover:text-sky-600"
          }`}
          onClick={() => onClickAdd(null)}
        >
          <AddIcon />
          <span>Add Task</span>
        </button>
      )}
    </div>
  );
};
