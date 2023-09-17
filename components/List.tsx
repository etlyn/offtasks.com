import React from "react";
import { updateTask } from "../backend";
import { CheckIcon, MarkedIcon } from "../icons";
import { useTheme } from "next-themes";

type TListProps = {
  task: any;
  openHandler: Function;
  statusHandler: Function;
};

export const List = ({ task, openHandler }: TListProps) => {
  const { theme } = useTheme();

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
      <button className={`flex self-start pt-1`} onClick={updateStatus}>
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
          } font-extralight text-left`}
        >
          {task.content}
        </h1>
      </button>
    </div>
  );
};
