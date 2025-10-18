import React, { useContext, useEffect, useState } from "react";
import { X } from "lucide-react";
import { updateTask, createTask, deleteTask } from "@/lib/supabase";
import { Slider } from "@/components/Slider";
import { AppStateContext } from "@/providers/app-state";
import type { Task, TaskGroup } from "@/types";

interface ModalProps {
  closeModal: () => void;
  initialRef: React.RefObject<HTMLTextAreaElement> | null;
  task: Task | null;
  selectedGroup: TaskGroup;
}

export const Modal = ({ closeModal, initialRef, task, selectedGroup }: ModalProps) => {
  const [content, setContent] = useState("");
  const [targetGroup, setTargetGroup] = useState<TaskGroup>(selectedGroup);
  const { appState } = useContext(AppStateContext);

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

  const refreshTasks = async () => {
    if (appState?.refreshTasks) {
      await appState.refreshTasks();
    }
  };

  const submitHandler = async () => {
    if (!content.trim()) {
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

    await refreshTasks();
    closeHandler();
  };

  const deleteHandler = async (taskId?: string) => {
    if (taskId) {
      await deleteTask(taskId);
      await refreshTasks();
    }
    closeHandler();
  };

  const closeHandler = () => {
    setContent("");
    closeModal();
  };

  const handleKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeHandler();
    }

    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
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
      <div className="absolute inset-0" onClick={closeHandler} aria-hidden="true" />

      <div className="relative z-10 flex w-full max-w-xl flex-col gap-5 rounded-2xl bg-white p-8 text-zinc-900 shadow-2xl transition dark:bg-zinc-800 dark:text-zinc-100">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold">Task</h1>
          <button
            className="text-zinc-500 transition hover:text-zinc-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:text-zinc-400 dark:hover:text-zinc-200 dark:focus:ring-cyan-400"
            onClick={closeHandler}
            aria-label="Close"
            type="button"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <textarea
          ref={initialRef ?? undefined}
          placeholder="Defines what is already done. This is only happening with Theo Nius."
          className="min-h-[140px] w-full resize-none rounded-lg bg-zinc-100 px-4 py-3 text-base font-normal leading-snug text-zinc-900 outline-none ring-1 ring-transparent transition placeholder:text-zinc-500 focus:ring-sky-500 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:ring-cyan-400"
          onChange={(event) => setContent(event.target.value)}
          value={content}
          autoFocus
        />

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

        <div className="flex flex-row justify-between gap-3">
          <button
            className={`flex items-center justify-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-400 dark:text-red-300 ${
              task
                ? "border-red-500 text-red-500 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white"
                : ""
            }`}
            type="button"
            onClick={() => deleteHandler(task?.id)}
            disabled={!task}
          >
            Delete
          </button>

          <button
            className={`flex items-center justify-center gap-2 rounded-lg px-8 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
              content.trim().length
                ? "bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-400 hover:to-cyan-500 dark:from-cyan-500 dark:to-cyan-400"
                : "bg-zinc-500"
            }`}
            type="button"
            onClick={submitHandler}
            disabled={!content.trim().length}
          >
            {task ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};
