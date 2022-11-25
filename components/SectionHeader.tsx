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
  return (
    <div className="container flex flex-row justify-between border-b-zinc-100 border-b border-opacity-50 pb-2 mb-4">
      <div className="flex flex-row font-medium text-zinc-50">
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
        <h2 className="font-extralight">Add Task</h2>
      </button>
    </div>
  );
};
