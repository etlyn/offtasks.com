import { TaskItem } from "./TaskItem";
import { Task } from "../types/task";
import { motion } from "motion/react";
import { Inbox } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface TaskColumnProps {
  title: string;
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onEditTask: (id: string) => void;
  category: string;
  showMetadata?: boolean;
}

export function TaskColumn({
  title,
  tasks,
  onToggleTask,
  onEditTask,
  category,
  showMetadata = false,
}: TaskColumnProps) {
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  // Sort tasks: incomplete tasks first, then completed tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  return (
    <div className="content-stretch flex flex-col gap-[24px] items-center w-full max-w-[450px] bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-800/60 dark:to-zinc-800/30 rounded-[16px] p-[24px] border border-zinc-200/60 dark:border-zinc-700/40 shadow-sm dark:shadow-lg hover:shadow-md dark:hover:shadow-xl transition-all backdrop-blur-sm">
      <div className="box-border content-stretch flex flex-col gap-[12px] pb-[16px] pt-0 px-0 relative shrink-0 w-full border-b-[0.5px] border-zinc-200 dark:border-zinc-700">
        <div className="flex items-start justify-between w-full">
          <p className="font-['Poppins',_sans-serif] leading-[1.4] not-italic relative shrink-0 text-[16px] text-nowrap text-zinc-900 dark:text-zinc-100 whitespace-pre">
            {title} - {completedCount} of {totalCount}
          </p>
        </div>
      </div>

      <div className="content-stretch flex flex-col gap-[16px] items-start relative w-full max-h-[calc(100vh-420px)] min-h-[200px] overflow-y-auto pr-[4px] scrollbar-visible">
        {tasks.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={`No ${title.toLowerCase()} tasks`}
            description="Tasks for this section will show up here once you add them."
            className="w-full border-none bg-transparent px-4 py-10 dark:bg-transparent"
          />
        ) : (
          sortedTasks.map((task) => (
            <TaskItem
              key={task.id}
              id={task.id}
              text={task.text}
              completed={task.completed}
              overdue={task.overdue}
              onToggle={onToggleTask}
              onClick={onEditTask}
              priority={task.priority}
              label={task.label}
              showMetadata={showMetadata}
            />
          ))
        )}
      </div>
    </div>
  );
}
