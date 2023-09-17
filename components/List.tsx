import React from "react";
import { updateTask } from "../backend";
import { CheckIcon, MarkedIcon } from "../icons";
import { useTheme } from "next-themes";
import { useDate } from "../hooks/useDate";

type TListProps = {
  task: any;
  openHandler: Function;
  statusHandler: Function;
  date?: any;
};

export const List = ({ task, openHandler }: TListProps) => {
  const { theme } = useTheme();
  const { today } = useDate();

  const updateStatus = () => {
    updateTask(
      task.id,
      task.content,
      !task.isComplete,
      task.priority,
      task.targetGroup
    );
  };

  return (
    <div
      className={`${
        theme === "dark" ? "text-zinc-50" : "text-zinc-900"
      } flex flex-row mb-2 items-center w-full h-auto`}
    >
      <button
        className={`flex self-start pt-1 ${
          task.date != today && "text-red-400"
        }`}
        onClick={updateStatus}
      >
        {task.isComplete ? (
          <MarkedIcon checkColor={`${theme === "dark" ? "black" : "white"}`} />
        ) : (
          <CheckIcon />
        )}
      </button>

      <button onClick={() => openHandler(task)} className="flex w-full py-1">
        <h1
          className={`${
            task.isComplete && "line-through"
          } font-extralight text-left ${task.date != today && "text-red-400"}`}
        >
          {task.content}
        </h1>
      </button>
    </div>
  );
};
