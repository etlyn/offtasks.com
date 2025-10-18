import { useTheme } from "next-themes";
import { useContext, useEffect, useState } from "react";
import { updateTask, createTask, deleteTask } from "../backend";
import { CloseIcon, RemoveIcon, SaveIcon } from "../icons";
import { Slider } from "./Slider";
import { AppState } from "../localState";

export const Modal = ({ closeModal, initialRef, task, selectedGroup }) => {
  const { theme } = useTheme();
  const [content, setContent] = useState("");
  const [targetGroup, setTargetGroup] = useState(selectedGroup);
  const { appState } = useContext(AppState);

  useEffect(() => {
    if (task) {
      setContent(task.content);
      const derivedGroup =
        task.target_group === "close"
          ? "today"
          : task.target_group ?? selectedGroup ?? "today";
      setTargetGroup(derivedGroup);
    } else {
      setContent("");
      setTargetGroup(selectedGroup ?? "today");
    }
  }, [task, selectedGroup]);

  const submitHandler = async () => {
    if (content?.length === 0) {
      closeHandler();
      return;
    }

    if (task) {
      await updateTask(
        task.id,
        content,
        task.isComplete,
        task.priority,
        targetGroup,
        task.date
      );
    } else {
      await createTask(content, targetGroup);
    }

    appState?.refreshTasks?.();
    closeHandler();
  };

  const deleteHandler = async (taskId) => {
    if (taskId) {
      await deleteTask(taskId);
    }
    appState?.refreshTasks?.();
    closeHandler();
  };

  const closeHandler = () => {
    setContent("");
    closeModal();
  };

  const handleKeyboard = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeHandler();
    }

    if (
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey)
    ) {
      event.preventDefault();
      submitHandler();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 px-4 backdrop-blur-sm"
      onKeyDown={handleKeyboard}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0"
        onClick={closeHandler}
        aria-hidden="true"
      />

      <div
        className={`relative z-10 flex w-full max-w-xl flex-col gap-5 rounded-2xl p-8 shadow-2xl ${
          theme === "dark"
            ? "bg-zinc-800 text-zinc-50"
            : "bg-white text-zinc-900"
        }`}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold">Task</h1>
          <button
            className={`transition ${
              theme === "dark"
                ? "text-zinc-400 hover:text-zinc-200"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
            onClick={closeHandler}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <textarea
          ref={initialRef}
          placeholder="Defines what is already done. This is only happening with Theo Nius."
          className={`min-h-[140px] w-full resize-none rounded-lg px-4 py-3 text-base font-normal leading-snug outline-none transition ${
            theme === "dark"
              ? "bg-zinc-700 text-zinc-50 placeholder:text-zinc-400"
              : "bg-zinc-100 text-zinc-900 placeholder:text-zinc-400"
          }`}
          onChange={(event) => setContent(event.target.value)}
          value={content}
          autoFocus
        />

        <div>
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

        <div className="flex flex-row justify-between gap-3">
          <button
            className={`flex items-center justify-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-medium transition ${
              task
                ? theme === "dark"
                  ? "border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  : "border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                : "cursor-not-allowed opacity-40"
            }`}
            type="button"
            onClick={() => {
              deleteHandler(task?.id);
            }}
            disabled={!task}
          >
            <span>Delete</span>
          </button>

          <button
            className={`flex items-center justify-center gap-2 rounded-lg px-8 py-2.5 text-sm font-medium text-white transition ${
              content?.trim()?.length
                ? theme === "dark"
                  ? "bg-cyan-600 hover:bg-cyan-700"
                  : "bg-sky-500 hover:bg-sky-600"
                : "cursor-not-allowed opacity-40"
            }`}
            type="button"
            onClick={submitHandler}
            disabled={!content?.trim()?.length}
          >
            <span>{task ? "Update" : "Save"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
