import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Task } from "../types/task";
import svgPaths from "../imports/svg-xj1j8w0l61";

interface CompletedTasksSheetProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  isDark: boolean;
}

export function CompletedTasksSheet({ isOpen, onClose, tasks, isDark }: CompletedTasksSheetProps) {
  const completedTasks = tasks.filter((task) => task.completed);

  const formatCompletionDate = (timestamp?: number) => {
    if (!timestamp) return "Recently";
    
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (taskDate.getTime() === today.getTime()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else if (taskDate.getTime() === yesterday.getTime()) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
        <SheetHeader>
          <SheetTitle className="font-['Poppins',_sans-serif] text-[24px] text-zinc-900 dark:text-zinc-100">
            Completed Tasks
          </SheetTitle>
          <SheetDescription className="font-['Poppins',_sans-serif] text-[14px] text-zinc-500 dark:text-zinc-400 mt-2">
            {completedTasks.length} task{completedTasks.length === 1 ? "" : "s"} completed
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto pr-2">
          {completedTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="relative size-[64px] mx-auto mb-4 opacity-30">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                  <g>
                    <path
                      d={svgPaths.p31a5d180}
                      stroke={isDark ? "#F4F4F5" : "#18181B"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.2"
                    />
                  </g>
                </svg>
              </div>
              <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-400 dark:text-zinc-500">
                No completed tasks yet
              </p>
            </div>
          ) : (
            completedTasks.map((task) => (
              <div
                key={task.id}
                className="group bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-[12px] p-4 transition-all hover:shadow-none dark:hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0 size-[20px] mt-0.5">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                      <g>
                        <rect
                          className="transition-all duration-200 fill-sky-600 dark:fill-sky-500"
                          height="24"
                          rx="6"
                          width="24"
                        />
                        <path
                          d={svgPaths.p2c7d1f00}
                          stroke="#FFFFFF"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </g>
                    </svg>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-500 dark:text-zinc-400 line-through break-words mb-1">
                      {task.text}
                    </p>
                    <p className="font-['Poppins',_sans-serif] text-[11px] text-zinc-400 dark:text-zinc-500">
                      Completed {formatCompletionDate(task.completedAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
