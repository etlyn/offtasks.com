import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { updateTask, createTask, deleteTask } from "../backend";
import { CloseIcon, RemoveIcon, SaveIcon } from "../icons";
import { Slider } from "./Slider";

export const Modal = ({ closeModal, initialRef, task, selectedGroup }) => {
  const { theme } = useTheme();
  const [content, setContent] = useState("");
  const [targetGroup, setTargetGroup] = useState(selectedGroup);

  useEffect(() => {
    if (task) {
      setContent(task.content);
    } else {
      setContent("");
    }
  }, [task]);

  const submitHandler = async () => {
    if (content?.length === 0) {
      closeHandler();
      return;
    }

    if (task) {
      await updateTask(task.id, content, task.isComplete, task.priority, targetGroup, task.date);
    } else {
      createTask(content, targetGroup);
    }

    closeHandler();
  };

  const deleteHandler = async (taskId) => {
    if (taskId) {
      await deleteTask(taskId);
    }
    closeHandler();
  };

  const closeHandler = () => {
    setContent("");
    closeModal();
  };

  const handleKeyboard = (event) => {
    if (event.key === "Enter") {
      submitHandler();
    }
  };

  return (
    <>
      <div
        className="flex justify-center items-center overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none"
        onKeyPress={handleKeyboard}
      >
        <div
          className={`flex flex-col px-4 md:w-1/3 w-full rounded-md ${
            theme === "dark"
              ? "bg-zinc-800 text-zinc-50"
              : "bg-zinc-50 text-zinc-900 border border-zinc-800 border-opacity-10 "
          }`}
        >
          <div className="flex justify-between py-4">
            <h1 className="font-medium">Task</h1>
            <button
              className="bg-transparent float-right "
              onClick={closeHandler}
              onKeyDown={closeHandler}
            >
              <CloseIcon />
            </button>
          </div>

          <div className="relative">
            <textarea
              ref={initialRef}
              placeholder="Add your task here"
              className="shadow appearance-none border rounded w-full h-24 px-2 py-2 font-extralight  bg-transparent flex outline-none focus:outline-none"
              onChange={(event) => setContent(event.target.value)}
              value={content}
              autoFocus
            />
          </div>

          <div className="pb-3 mt-6 flex flex-row">
            <Slider
              label1="Today"
              label2="Tomorrow"
              label3="Upcoming"
              onClick1={() => setTargetGroup("today")}
              onClick2={() => setTargetGroup("tomorrow")}
              onClick3={() => setTargetGroup("upcoming")}
              isLabel1Active={targetGroup === "today"}
              isLabel2Active={targetGroup === "tomorrow"}
              isLabel3Active={targetGroup === "upcoming"}
            />
          </div>

          <div className="flex flex-row justify-between mt-6 mb-6">
            <button
              className="text-red-500 px-6 py-2 text-sm bg-transparent rounded-xl border-red-500 border flex flex-row "
              type="button"
              onClick={() => {
                deleteHandler(task?.id);
              }}
            >
              <RemoveIcon />
              <h1 className="mx-2 self-center">Delete</h1>
            </button>

            <button
              className="bg-sky-500 text-sm px-6 py-2 rounded-xl flex flex-row"
              type="button"
              onClick={submitHandler}
            >
              <SaveIcon />
              <h1 className="mx-2 self-center"> {task ? "Update" : "Save"}</h1>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
