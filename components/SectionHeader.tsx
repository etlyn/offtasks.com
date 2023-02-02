import { useTheme } from "next-themes";
import React from "react";
import { AddIcon } from "../icons";

type TSectionHeader = {
  headline: string;
  onClickAdd: Function;
  progressData: any;
  showCounter: boolean;
};

export const SectionHeader = ({
  headline,
  onClickAdd,
  progressData,
  showCounter,
}: TSectionHeader) => {
  const { theme } = useTheme();

  return (
    <div
      className={`${
        theme === "dark"
          ? "border-b-zinc-100 text-zinc-50"
          : "border-b-zinc-900 text-zinc-900"
      } container flex flex-row justify-between border-b border-opacity-20 pb-2 mb-4`}
    >
      <div className="flex flex-row font-medium">
        <h1 className=" flex">{headline}</h1>
        {showCounter ? (
          <h1>
            &nbsp;- {progressData.completedTasks} of {progressData.allTasks}
          </h1>
        ) : (
          <h1>&nbsp;- {progressData.allTasks}</h1>
        )}
      </div>

      <button
        className="text-sky-500 flex flex-row"
        onClick={() => onClickAdd(null)}
      >
        <AddIcon />
        <h2 className="font-medium">Add Task</h2>
      </button>
    </div>
  );
};
