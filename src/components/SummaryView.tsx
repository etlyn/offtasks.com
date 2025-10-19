import { Task } from "../types/task";
import { Badge } from "./ui/badge";

interface SummaryViewProps {
  tasks: Task[];
  isDark: boolean;
}

function getRelativeDate(timestamp: number): string {
  const now = new Date();
  const completedDate = new Date(timestamp);
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const completed = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());
  
  const diffTime = today.getTime() - completed.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return `${diffDays} days ago`;
  if (diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  if (diffDays <= 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

function groupTasksByDate(tasks: Task[]): Map<string, Task[]> {
  const grouped = new Map<string, Task[]>();
  
  tasks.forEach(task => {
    if (task.completed && task.completedAt) {
      const relativeDate = getRelativeDate(task.completedAt);
      if (!grouped.has(relativeDate)) {
        grouped.set(relativeDate, []);
      }
      grouped.get(relativeDate)!.push(task);
    }
  });
  
  return grouped;
}

export function SummaryView({ tasks, isDark }: SummaryViewProps) {
  const completedTasks = tasks
    .filter(t => t.completed && t.completedAt)
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  
  const groupedTasks = groupTasksByDate(completedTasks);
  
  const sortedGroups = Array.from(groupedTasks.entries()).sort((a, b) => {
    const order = ["Today", "Yesterday"];
    const aIndex = order.indexOf(a[0]);
    const bIndex = order.indexOf(b[0]);
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    const aMatch = a[0].match(/^(\d+)/);
    const bMatch = b[0].match(/^(\d+)/);
    if (aMatch && bMatch) {
      return parseInt(aMatch[1]) - parseInt(bMatch[1]);
    }
    
    return 0;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "today":
        return "bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400";
      case "tomorrow":
        return "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400";
      case "upcoming":
        return "bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400";
      default:
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto">
      <div className="mb-8">
        <h2 className="font-['Poppins',_sans-serif] text-[28px] text-zinc-900 dark:text-zinc-100 mb-2">
          Task History Summary
        </h2>
        <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-500 dark:text-zinc-400">
          View all your completed tasks organized by completion date
        </p>
      </div>
      
      <div className="space-y-8">
        {sortedGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative shrink-0 size-[80px] opacity-20 mb-4">
              <svg className="block size-full" fill="none" viewBox="0 0 24 24">
                <path 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                  stroke="currentColor" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  className="text-zinc-400 dark:text-zinc-600"
                />
              </svg>
            </div>
            <p className="font-['Poppins',_sans-serif] text-[16px] text-zinc-500 dark:text-zinc-400">
              No completed tasks yet
            </p>
            <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-400 dark:text-zinc-500 mt-2">
              Complete tasks to see them organized by date here
            </p>
          </div>
        ) : (
          sortedGroups.map(([dateLabel, dateTasks]) => (
            <div key={dateLabel} className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="font-['Poppins',_sans-serif] text-[20px] text-zinc-900 dark:text-zinc-100">
                  {dateLabel}
                </h3>
                <div className="flex-1 h-[1px] bg-zinc-200 dark:bg-zinc-700" />
                <span className="font-['Poppins',_sans-serif] text-[13px] text-zinc-500 dark:text-zinc-400">
                  {dateTasks.length} task{dateTasks.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dateTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-4 rounded-[12px] bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 hover:shadow-md transition-all shadow-sm"
                  >
                    <div className="relative shrink-0 size-[20px] mt-[2px]">
                      <svg className="block size-full" fill="none" viewBox="0 0 24 24">
                        <path
                          d="M9 11l3 3L22 4"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          className="text-green-600 dark:text-green-500"
                        />
                        <path
                          d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          className="text-green-600 dark:text-green-500"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-500 dark:text-zinc-400 line-through break-words mb-2">
                        {task.text}
                      </p>
                      <Badge variant="secondary" className={`text-[11px] capitalize ${getCategoryColor(task.category)}`}>
                        {task.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
