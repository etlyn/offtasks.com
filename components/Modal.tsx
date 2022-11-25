import { useEffect, useState } from "react";
import { updateTask, createTask, deleteTask } from "../backend";
import { useDate } from "../hooks";
import { CloseIcon, RemoveIcon, SaveIcon } from "../icons";

export const Modal = ({ closeModal, initialRef, task, selectedDate }) => {
  const [content, setContent] = useState("");
  const [date, setDate] = useState(selectedDate);

  const { today, tomorrow, upcoming } = useDate();

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
      await updateTask(task.id, content, task.isComplete, date);
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

          <div className="flex mt-6  rounded-2xl  justify-around text-zinc-50 max-h-9 bg-zinc-700">
            <button
              onClick={() => setDate(today)}
              className={`py-2 px-6 flex flex-grow justify-center items-center rounded-l-2xl ${
                date === today && "bg-zinc-50 rounded-2xl self-center z-10"
              }`}
            >
              <h1 className={`${date === today && "text-zinc-900"}`}>
                &nbsp; Today &nbsp;
              </h1>
            </button>

            <div
              className={`py-3  w-0.5 ${date === upcoming && "bg-zinc-800"}`}
            />

            <button
              onClick={() => setDate(tomorrow)}
              className={`py-2 px-6 flex flex-grow  justify-center items-center ${
                date === tomorrow && "bg-zinc-50 rounded-2xl  self-center"
              }`}
            >
              <h1 className={`${date === tomorrow && "text-zinc-900"}`}>
                Tomorrow
              </h1>
            </button>

            <div className={`py-3  w-0.5 ${date === today && "bg-zinc-800"}`} />

            <button
              onClick={() => setDate(upcoming)}
              className={`py-2 px-6 flex flex-grow  justify-center items-center rounded-r-2xl ${
                date === upcoming && "bg-zinc-50 rounded-2xl  self-center"
              }`}
            >
              <h1 className={`${date === upcoming && "text-zinc-900"}`}>
                Upcoming
              </h1>
            </button>
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
