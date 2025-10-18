import React, { useContext, useEffect, useState, useRef } from "react";
import { X, ChevronDown, Trash2, Search, Plus } from "lucide-react";
import { updateTask, createTask, deleteTask } from "@/lib/supabase";
import { AppStateContext } from "@/providers/app-state";
import type { Task, TaskGroup } from "@/types";

interface ModalProps {
  closeModal: () => void;
  initialRef: React.RefObject<HTMLTextAreaElement> | null;
  task: Task | null;
  selectedGroup: TaskGroup;
}

const CATEGORIES = [
  { value: "none", label: "None", color: null },
  { value: "work", label: "Work", color: "#2b7fff" },
  { value: "personal", label: "Personal", color: "#22c55e" },
  { value: "home", label: "Home", color: "#f59e0b" },
  { value: "shopping", label: "Shopping", color: "#ec4899" },
  { value: "health", label: "Health", color: "#10b981" },
  { value: "finance", label: "Finance", color: "#8b5cf6" },
];

export const Modal = ({ closeModal, initialRef, task, selectedGroup }: ModalProps) => {
  const [content, setContent] = useState("");
  const [targetGroup, setTargetGroup] = useState<TaskGroup>(selectedGroup);
  const [priority, setPriority] = useState<number>(0);
  const [category, setCategory] = useState<string>("none");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const { appState } = useContext(AppStateContext);

  useEffect(() => {
    if (task) {
      setContent(task.content);
      const derivedGroup =
        task.target_group === "close"
          ? "today"
          : task.target_group ?? selectedGroup ?? "today";
      setTargetGroup(derivedGroup);
      setPriority(task.priority || 0);
    } else {
      setContent("");
      setTargetGroup(selectedGroup ?? "today");
      setPriority(0);
      setCategory("none");
    }
  }, [task, selectedGroup]);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCategoryDropdown(false);
        setCategorySearchQuery("");
      }
    };

    if (showCategoryDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCategoryDropdown]);

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
        priority,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 backdrop-blur-sm"
      onKeyDown={handleKeyboard}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0" onClick={closeHandler} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-[550px] rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="relative px-6 py-6">
          <h1 className="font-['Poppins'] text-base text-zinc-100">
            {task ? "Edit Task" : "New Task"}
          </h1>
          <button
            className="absolute right-5 top-5 flex h-5 w-5 items-center justify-center text-zinc-400 transition hover:text-zinc-100"
            onClick={closeHandler}
            aria-label="Close"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Task Input */}
        <div className="flex flex-col gap-2 px-6 pb-6">
          <label className="font-['Inter'] text-xs text-[#9f9fa9]">Task</label>
          <div className="relative">
            <textarea
              ref={initialRef ?? undefined}
              placeholder={task ? "What's on your agenda for tomorrow?" : "What's coming up?"}
              className="h-24 w-full resize-none rounded-lg border border-zinc-700 bg-transparent px-3 py-3 font-['Poppins'] text-sm leading-[21px] text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-600"
              onChange={(event) => setContent(event.target.value)}
              value={content}
              autoFocus
              maxLength={200}
            />
            <div className="absolute bottom-4 right-3">
              <span className="font-['Inter'] text-xs text-zinc-500">
                {content.length > 0 ? content.length : ""}
              </span>
            </div>
          </div>
        </div>

        {/* When Buttons */}
        <div className="flex flex-col gap-2 px-6 pb-6">
          <label className="font-['Inter'] text-xs text-[#9f9fa9]">When</label>
          <div className="flex h-8 overflow-hidden rounded-lg bg-zinc-700">
            <button
              type="button"
              onClick={() => setTargetGroup("today")}
              className={`flex-1 font-['Poppins'] text-xs transition ${
                targetGroup === "today"
                  ? "bg-[#0084d1] text-white shadow-sm"
                  : "text-neutral-50 hover:text-white"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTargetGroup("tomorrow")}
              className={`flex-1 border-l border-zinc-600 font-['Poppins'] text-xs transition ${
                targetGroup === "tomorrow"
                  ? "bg-[#0084d1] text-white shadow-sm"
                  : "text-neutral-50 hover:text-white"
              }`}
            >
              Tomorrow
            </button>
            <div className="w-px bg-zinc-600" />
            <button
              type="button"
              onClick={() => setTargetGroup("upcoming")}
              className={`flex-1 font-['Poppins'] text-xs transition ${
                targetGroup === "upcoming"
                  ? "bg-[#0084d1] text-white shadow-sm"
                  : "text-neutral-50 hover:text-white"
              }`}
            >
              Upcoming
            </button>
          </div>
        </div>

        {/* Priority and Category */}
        <div className="flex gap-3 px-6 pb-6">
          <div className="flex w-[158px] flex-col gap-2">
            <label className="font-['Inter'] text-xs text-[#9f9fa9]">Priority</label>
            <button
              type="button"
              className="flex h-9 items-center justify-between rounded-lg border border-zinc-700 bg-[rgba(38,38,38,0.3)] px-3.5 font-['Poppins'] text-[13px] leading-[19.5px] text-[#9f9fa9] transition hover:border-zinc-600"
            >
              <span>None</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-2 relative">
            <label className="font-['Inter'] text-xs text-[#9f9fa9]">Category</label>
            <button
              type="button"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex h-9 items-center justify-between rounded-lg border border-zinc-700 bg-[rgba(38,38,38,0.3)] px-3.5 font-['Poppins'] text-[13px] leading-[19.5px] transition hover:border-zinc-600"
            >
              <div className="flex items-center gap-1.5">
                {category !== "none" && (
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        CATEGORIES.find((cat) => cat.value === category)?.color || "transparent",
                    }}
                  />
                )}
                <span className={category !== "none" ? "text-zinc-300" : "text-[#9f9fa9]"}>
                  {CATEGORIES.find((cat) => cat.value === category)?.label || "None"}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>

            {/* Category Dropdown Menu */}
            {showCategoryDropdown && (
              <div
                ref={categoryDropdownRef}
                className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-px shadow-xl"
              >
                {/* Search Input */}
                <div className="border-b border-neutral-800 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search or add category..."
                      value={categorySearchQuery}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                      className="flex-1 bg-transparent font-['Poppins'] text-[13px] text-white outline-none placeholder:text-zinc-500"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Category Options */}
                <div className="max-h-48 overflow-y-auto p-1">
                  {CATEGORIES.filter((cat) =>
                    cat.label.toLowerCase().includes(categorySearchQuery.toLowerCase())
                  ).map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setCategory(cat.value);
                        setShowCategoryDropdown(false);
                        setCategorySearchQuery("");
                      }}
                      className={`flex w-full items-center gap-2 rounded px-2 py-2 font-['Poppins'] text-[13px] transition ${
                        category === cat.value
                          ? "bg-neutral-800 text-white"
                          : "text-zinc-400 hover:bg-neutral-800/50 hover:text-white"
                      }`}
                    >
                      {cat.color && (
                        <div
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                      )}
                      <span>{cat.label}</span>
                    </button>
                  ))}

                  {/* Add New Category Option */}
                  {categorySearchQuery.trim() &&
                    !CATEGORIES.some(
                      (cat) => cat.label.toLowerCase() === categorySearchQuery.toLowerCase()
                    ) && (
                      <button
                        type="button"
                        onClick={() => {
                          // In a real implementation, this would add the category to the database
                          // For now, just close the dropdown
                          setShowCategoryDropdown(false);
                          setCategorySearchQuery("");
                        }}
                        className="flex w-full items-center gap-2 rounded bg-neutral-800 px-2 py-2 font-['Poppins'] text-[13px] text-[#00bcff] transition hover:bg-neutral-700"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add category: "{categorySearchQuery}"</span>
                      </button>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          {task && (
            <button
              type="button"
              onClick={() => deleteHandler(task?.id)}
              className="flex h-8 items-center gap-2 rounded-lg px-6 font-['Poppins'] text-[13px] leading-[19.5px] text-zinc-400 transition hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={submitHandler}
            disabled={!content.trim().length}
            className={`h-8 rounded-lg px-5 font-['Poppins'] text-[13px] text-white transition ${
              content.trim().length
                ? "bg-[#0084d1] hover:bg-[#0094e1]"
                : "cursor-not-allowed bg-[#0084d1] opacity-50"
            }`}
          >
            {task ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};
