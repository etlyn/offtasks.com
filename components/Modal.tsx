import { useEffect, useState } from "react";
import { updateTask, createTask, deleteTask } from "../backend";
import { useDate } from "../hooks";
import { CloseIcon, RemoveIcon, SaveIcon } from "../icons";
import { Slider } from "./Slider";

export const Modal = ({ closeModal, initialRef, task, selectedDate }) => {
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState(1);
  const [date, setDate] = useState(selectedDate);

  const { today, tomorrow, upcoming } = useDate();

  useEffect(() => {
    if (task) {
      setContent(task.content);
      setPriority(task.priority);
    } else {
      setContent("");
      setPriority(1);
    }
  }, [task]);

  const submitHandler = async () => {
    if (content?.length === 0) {
      closeHandler();
      return;
    }

    if (task) {
      await updateTask(task.id, content, task.isComplete, date, priority);
    } else {
      createTask(content, date);
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
        <div className="flex flex-col bg-zinc-800 px-4 md:w-1/3 w-full rounded-md">
          <div className="flex justify-between py-4">
            <h1 className="text-zinc-50 font-medium">Task</h1>
            <button
              className="bg-transparent float-right text-zinc-50"
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
              className="shadow appearance-none border rounded w-full h-24 px-2 py-2 text-zinc-50 font-extralight  bg-transparent flex outline-none focus:outline-none"
              onChange={(event) => setContent(event.target.value)}
              value={content}
              autoFocus
            />
          </div>

          <div className="py-6 flex flex-row justify-between items-center">
            <div className="flex basis-1/2">
              <h1 className="text-zinc-50 font-extralight">Priority:</h1>
            </div>
            <div className="flex basis-1/2">
              <Slider
                label1="Low"
                label2="Medium"
                label3="High"
                onClick1={() => setPriority(1)}
                onClick2={() => setPriority(2)}
                onClick3={() => setPriority(3)}
                isLabel1Active={priority === 1}
                isLabel2Active={priority === 2}
                isLabel3Active={priority === 3}
              />
            </div>
          </div>

          <div className="pb-3 flex flex-row justify-between items-center">
            <div className="flex">
              <h1 className="text-zinc-50 font-extralight">Date:</h1>
            </div>
            <div className="flex basis-1/2">
              <Slider
                label1="Today"
                label2="Tomorrow"
                label3="Upcoming"
                onClick1={() => setDate(today)}
                onClick2={() => setDate(tomorrow)}
                onClick3={() => setDate(upcoming)}
                isLabel1Active={date === today}
                isLabel2Active={date === tomorrow}
                isLabel3Active={date === upcoming}
              />
            </div>
          </div>

          <div className="flex flex-row justify-between mt-8 mb-6">
            <button
              className="text-red-500 px-6 py-3 text-sm bg-transparent rounded-xl border-red-500 border flex flex-row "
              type="button"
              onClick={() => {
                deleteHandler(task?.id);
              }}
            >
              <RemoveIcon />
              <h1 className="mx-2 self-center">Delete</h1>
            </button>

            <button
              className="text-zinc-50 bg-sky-500 text-sm px-6 py-3 rounded-xl flex flex-row"
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
