import { Task } from "../types/task";
import svgPaths from "../imports/svg-xj1j8w0l61";
import { getCategoryConfig, getDefaultCategoryColor } from "../utils/categoryConfig";

interface CompletedViewProps {
  tasks: Task[];
  isDark: boolean;
}

export function CompletedView({ tasks, isDark }: CompletedViewProps) {
  const completedTasks = tasks.filter((task) => task.completed);

  const formatCompletionDate = (timestamp?: number) => {
    if (!timestamp) return "Recently";
    
    const date = new Date(timestamp);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    
    return `${day} ${month}, ${year}`;
  };

  const getPriorityFlagColor = (priority?: "low" | "medium" | "high") => {
    switch (priority) {
      case "high":
        return "#EF4444"; // red-500
      case "medium":
        return "#F59E0B"; // amber-500
      case "low":
        return "#3B82F6"; // blue-500
      default:
        return "";
    }
  };

  const renderPriorityFlag = (priority?: "low" | "medium" | "high") => {
    if (!priority) return null;
    
    const strokeColor = getPriorityFlagColor(priority);
    
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
        <path 
          d="M3 2L3 12M3 2L10 5L3 8" 
          stroke={strokeColor} 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill={strokeColor}
          fillOpacity="0.2"
        />
      </svg>
    );
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h2 className="font-['Poppins',_sans-serif] text-[28px] text-zinc-900 dark:text-zinc-100 mb-2">
          Completed Tasks
        </h2>
        <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-500 dark:text-zinc-400">
          {completedTasks.length} task{completedTasks.length === 1 ? "" : "s"} completed
        </p>
      </div>

      <div className="space-y-3">
        {completedTasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative size-[80px] mx-auto mb-4 opacity-20">
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
            <p className="font-['Poppins',_sans-serif] text-[16px] text-zinc-400 dark:text-zinc-500">
              No completed tasks yet
            </p>
            <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-400 dark:text-zinc-500 mt-2">
              Complete tasks to see them here
            </p>
          </div>
        ) : (
          completedTasks.map((task) => (
            <div
              key={task.id}
              className="group bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-[16px] p-5 transition-all shadow-none hover:shadow-sm dark:shadow-sm dark:hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <button className="relative shrink-0 size-[24px] mt-0.5 cursor-default opacity-40">
                  <svg className="block size-full" fill="none" viewBox="0 0 24 24">
                    <rect
                      fill={isDark ? "#71717a" : "#a1a1aa"}
                      height="24"
                      rx="6"
                      width="24"
                    />
                    <path
                      d="M7 12L10.5 15.5L17 9"
                      stroke="#FFFFFF"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                    />
                  </svg>
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <p className="font-['Poppins',_sans-serif] text-[15px] text-zinc-500 dark:text-zinc-400 line-through break-words">
                      {task.text}
                    </p>
                    <p className="font-['Poppins',_sans-serif] text-[12px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap shrink-0">
                      {formatCompletionDate(task.completedAt)}
                    </p>
                  </div>
                  
                  {/* Priority and Category metadata */}
                  {(task.priority || task.label) && (
                    <div className="flex flex-wrap items-center gap-[6px]">
                      {task.priority && renderPriorityFlag(task.priority)}
                      {task.label && (() => {
                        const config = getCategoryConfig(task.label) || getDefaultCategoryColor();
                        return (
                          <span className={`inline-flex items-center px-[8px] py-[3px] rounded-[6px] border font-['Poppins',_sans-serif] text-[11px] opacity-70 ${config.bgColor} ${config.borderColor} ${config.color}`}>
                            {task.label}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
