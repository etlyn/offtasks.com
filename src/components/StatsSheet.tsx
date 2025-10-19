import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Task } from "../types/task";
import { BarChart3, CheckCircle2, Clock, TrendingUp } from "lucide-react";

interface StatsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
}

function getCompletionStats(tasks: Task[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const completedTasks = tasks.filter(t => t.completed && t.completedAt);
  
  // Tasks completed today
  const completedToday = completedTasks.filter(t => {
    const completedDate = new Date(t.completedAt!);
    return completedDate >= today;
  }).length;
  
  // Tasks completed this week
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const completedThisWeek = completedTasks.filter(t => {
    const completedDate = new Date(t.completedAt!);
    return completedDate >= weekAgo;
  }).length;
  
  // Tasks completed this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedThisMonth = completedTasks.filter(t => {
    const completedDate = new Date(t.completedAt!);
    return completedDate >= monthStart;
  }).length;
  
  // Category breakdown
  const categoryStats = {
    today: tasks.filter(t => t.category === "today" && t.completed).length,
    tomorrow: tasks.filter(t => t.category === "tomorrow" && t.completed).length,
    upcoming: tasks.filter(t => t.category === "upcoming" && t.completed).length,
  };
  
  // Completion rate
  const totalTasks = tasks.length;
  const completedCount = completedTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  
  // Active tasks
  const activeTasks = tasks.filter(t => !t.completed).length;
  const overdueTasks = tasks.filter(t => t.overdue && !t.completed).length;
  
  return {
    completedToday,
    completedThisWeek,
    completedThisMonth,
    categoryStats,
    completionRate,
    activeTasks,
    overdueTasks,
    totalCompleted: completedCount,
  };
}

export function StatsSheet({ isOpen, onClose, tasks }: StatsSheetProps) {
  const stats = getCompletionStats(tasks);
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Statistics</SheetTitle>
          <SheetDescription>
            Track your productivity and task completion metrics
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="size-4 text-sky-600 dark:text-sky-500" />
                <p className="font-['Poppins',_sans-serif] text-[12px] text-sky-600 dark:text-sky-500">
                  Completed
                </p>
              </div>
              <p className="font-['Poppins',_sans-serif] text-[24px] text-sky-700 dark:text-sky-400">
                {stats.totalCompleted}
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="size-4 text-amber-600 dark:text-amber-500" />
                <p className="font-['Poppins',_sans-serif] text-[12px] text-amber-600 dark:text-amber-500">
                  Active
                </p>
              </div>
              <p className="font-['Poppins',_sans-serif] text-[24px] text-amber-700 dark:text-amber-400">
                {stats.activeTasks}
              </p>
            </div>
          </div>
          
          {/* Completion Rate */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-sky-50 dark:from-purple-950/20 dark:to-sky-950/20 border border-purple-200 dark:border-purple-900">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-purple-600 dark:text-purple-500" />
                <p className="font-['Poppins',_sans-serif] text-[12px] text-purple-600 dark:text-purple-500">
                  Completion Rate
                </p>
              </div>
              <p className="font-['Poppins',_sans-serif] text-[20px] text-purple-700 dark:text-purple-400">
                {stats.completionRate}%
              </p>
            </div>
            <div className="w-full h-2 bg-purple-200 dark:bg-purple-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-600 dark:bg-purple-500 transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
          
          {/* Time-based stats */}
          <div className="space-y-3">
            <h3 className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
              Recent Activity
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-700 dark:text-zinc-300">
                  Completed today
                </p>
                <p className="font-['Poppins',_sans-serif] text-[16px] text-zinc-900 dark:text-zinc-100">
                  {stats.completedToday}
                </p>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-700 dark:text-zinc-300">
                  Completed this week
                </p>
                <p className="font-['Poppins',_sans-serif] text-[16px] text-zinc-900 dark:text-zinc-100">
                  {stats.completedThisWeek}
                </p>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-700 dark:text-zinc-300">
                  Completed this month
                </p>
                <p className="font-['Poppins',_sans-serif] text-[16px] text-zinc-900 dark:text-zinc-100">
                  {stats.completedThisMonth}
                </p>
              </div>
            </div>
          </div>
          
          {/* Category breakdown */}
          <div className="space-y-3">
            <h3 className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
              Completed by Category
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900">
                <p className="font-['Poppins',_sans-serif] text-[14px] text-sky-700 dark:text-sky-400">
                  Today
                </p>
                <p className="font-['Poppins',_sans-serif] text-[16px] text-sky-900 dark:text-sky-300">
                  {stats.categoryStats.today}
                </p>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900">
                <p className="font-['Poppins',_sans-serif] text-[14px] text-purple-700 dark:text-purple-400">
                  Tomorrow
                </p>
                <p className="font-['Poppins',_sans-serif] text-[16px] text-purple-900 dark:text-purple-300">
                  {stats.categoryStats.tomorrow}
                </p>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                <p className="font-['Poppins',_sans-serif] text-[14px] text-amber-700 dark:text-amber-400">
                  Upcoming
                </p>
                <p className="font-['Poppins',_sans-serif] text-[16px] text-amber-900 dark:text-amber-300">
                  {stats.categoryStats.upcoming}
                </p>
              </div>
            </div>
          </div>
          
          {/* Overdue tasks warning */}
          {stats.overdueTasks > 0 && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
              <p className="font-['Poppins',_sans-serif] text-[14px] text-red-700 dark:text-red-400">
                ⚠️ You have {stats.overdueTasks} overdue task{stats.overdueTasks !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
