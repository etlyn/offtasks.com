import React from "react";
import { updateTask } from "../backend";
import { CheckIcon, MarkedIcon } from "../icons";
import { useDate } from "../hooks";

type TListProps = {
  task: any;
  openHandler: Function;
  statusHandler: Function;
  date?: any;
};

export const List = ({ task, openHandler, date }: TListProps) => {
  const { today } = useDate();

  const updateStatus = () => {
    updateTask(task.id, task.content, !task.isComplete, today);
  };

  return (
    <div className="flex flex-row text-zinc-50 mb-2 items-center w-full h-auto">
      <button
        className={`flex self-start pt-1 ${
          date && task.date != date && "text-red-400"
        }`}
        onClick={updateStatus}
      >
        {task.isComplete ? <MarkedIcon /> : <CheckIcon />}
      </button>

      <button onClick={() => openHandler(task)} className="flex w-full py-1">
        <h1
          className={`${
            task.isComplete && "line-through"
          } font-extralight text-left ${
            date && task.date != date && "text-red-400"
          }`}
        >
          {task.content}
        </h1>
      </button>
    </div>
  );
};
