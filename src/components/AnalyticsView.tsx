import { Task } from "../types/task";
import { CheckCircle2, Clock, TrendingUp, AlertTriangle, Calendar, Flag, Tag } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useMemo } from "react";
import { getCategoryConfig } from "../utils/categoryConfig";

interface AnalyticsViewProps {
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
  
  // Active tasks by category
  const activeTasks = tasks.filter(t => !t.completed).length;
  const activeByCategory = {
    today: tasks.filter(t => t.category === "today" && !t.completed).length,
    tomorrow: tasks.filter(t => t.category === "tomorrow" && !t.completed).length,
    upcoming: tasks.filter(t => t.category === "upcoming" && !t.completed).length,
  };
  
  const overdueTasks = tasks.filter(t => t.overdue && !t.completed).length;
  
  // Priority breakdown
  const priorityStats = {
    high: {
      active: tasks.filter(t => !t.completed && t.priority === "high").length,
      completed: tasks.filter(t => t.completed && t.priority === "high").length,
    },
    medium: {
      active: tasks.filter(t => !t.completed && t.priority === "medium").length,
      completed: tasks.filter(t => t.completed && t.priority === "medium").length,
    },
    low: {
      active: tasks.filter(t => !t.completed && t.priority === "low").length,
      completed: tasks.filter(t => t.completed && t.priority === "low").length,
    },
  };
  
  // Label breakdown
  const labelStats: Record<string, { active: number; completed: number }> = {};
  tasks.forEach(task => {
    if (task.label) {
      if (!labelStats[task.label]) {
        labelStats[task.label] = { active: 0, completed: 0 };
      }
      if (task.completed) {
        labelStats[task.label].completed++;
      } else {
        labelStats[task.label].active++;
      }
    }
  });
  
  // Last 7 days completion data
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const count = completedTasks.filter(t => {
      const completedDate = new Date(t.completedAt!);
      return completedDate >= date && completedDate < nextDate;
    }).length;
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    last7Days.push({
      day: dayNames[date.getDay()],
      count,
      isToday: i === 0,
    });
  }
  
  return {
    completedToday,
    completedThisWeek,
    completedThisMonth,
    categoryStats,
    completionRate,
    activeTasks,
    activeByCategory,
    overdueTasks,
    totalCompleted: completedCount,
    totalTasks,
    priorityStats,
    labelStats,
    last7Days,
  };
}

export function AnalyticsView({ tasks }: AnalyticsViewProps) {
  const stats = useMemo(() => getCompletionStats(tasks), [tasks]);
  
  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h2 className="font-['Poppins',_sans-serif] text-[28px] text-zinc-900 dark:text-zinc-100 mb-2">
          Analytics & Insights
        </h2>
        <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-500 dark:text-zinc-400">
          Track your productivity and task completion metrics
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-sky-50 via-sky-50/80 to-sky-100/60 dark:from-zinc-800/70 dark:via-zinc-800/50 dark:to-sky-900/10 border border-sky-200/80 dark:border-zinc-700/40 rounded-[16px] p-6 shadow-sm hover:shadow-md dark:shadow-lg dark:hover:shadow-xl transition-all backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-sky-600 dark:bg-sky-600/80 rounded-[10px] shadow-sm">
              <CheckCircle2 className="size-5 text-white" />
            </div>
            <p className="font-['Poppins',_sans-serif] text-[13px] text-sky-700 dark:text-sky-400/90">
              Total Completed
            </p>
          </div>
          <p className="font-['Poppins',_sans-serif] text-[32px] text-sky-900 dark:text-sky-400">
            {stats.totalCompleted}
          </p>
          <p className="font-['Poppins',_sans-serif] text-[12px] text-sky-600 dark:text-zinc-500 mt-1">
            out of {stats.totalTasks} tasks
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 via-amber-50/80 to-amber-100/60 dark:from-zinc-800/70 dark:via-zinc-800/50 dark:to-amber-900/10 border border-amber-200/80 dark:border-zinc-700/40 rounded-[16px] p-6 shadow-sm hover:shadow-md dark:shadow-lg dark:hover:shadow-xl transition-all backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-600 dark:bg-amber-600/80 rounded-[10px] shadow-sm">
              <Clock className="size-5 text-white" />
            </div>
            <p className="font-['Poppins',_sans-serif] text-[13px] text-amber-700 dark:text-amber-400/90">
              Active Tasks
            </p>
          </div>
          <p className="font-['Poppins',_sans-serif] text-[32px] text-amber-900 dark:text-amber-400">
            {stats.activeTasks}
          </p>
          <p className="font-['Poppins',_sans-serif] text-[12px] text-amber-600 dark:text-zinc-500 mt-1">
            pending completion
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 via-purple-50/80 to-purple-100/60 dark:from-zinc-800/70 dark:via-zinc-800/50 dark:to-purple-900/10 border border-purple-200/80 dark:border-zinc-700/40 rounded-[16px] p-6 shadow-sm hover:shadow-md dark:shadow-lg dark:hover:shadow-xl transition-all backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-600 dark:bg-purple-600/80 rounded-[10px] shadow-sm">
              <TrendingUp className="size-5 text-white" />
            </div>
            <p className="font-['Poppins',_sans-serif] text-[13px] text-purple-700 dark:text-purple-400/90">
              Completion Rate
            </p>
          </div>
          <p className="font-['Poppins',_sans-serif] text-[32px] text-purple-900 dark:text-purple-400">
            {stats.completionRate}%
          </p>
          <div className="mt-3 w-full h-2 bg-purple-200 dark:bg-zinc-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-600 dark:bg-purple-500/80 transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 via-red-50/80 to-red-100/60 dark:from-zinc-800/70 dark:via-zinc-800/50 dark:to-red-900/10 border border-red-200/80 dark:border-zinc-700/40 rounded-[16px] p-6 shadow-sm hover:shadow-md dark:shadow-lg dark:hover:shadow-xl transition-all backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-600 dark:bg-red-600/80 rounded-[10px] shadow-sm">
              <AlertTriangle className="size-5 text-white" />
            </div>
            <p className="font-['Poppins',_sans-serif] text-[13px] text-red-700 dark:text-red-400/90">
              Overdue Tasks
            </p>
          </div>
          <p className="font-['Poppins',_sans-serif] text-[32px] text-red-900 dark:text-red-400">
            {stats.overdueTasks}
          </p>
          <p className="font-['Poppins',_sans-serif] text-[12px] text-red-600 dark:text-zinc-500 mt-1">
            {stats.overdueTasks > 0 ? 'need attention' : 'all caught up!'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-[16px] p-6 shadow-none dark:shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="size-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-['Poppins',_sans-serif] text-[18px] text-zinc-900 dark:text-zinc-100">
              Recent Activity
            </h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-[12px] bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-700/50">
              <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-700 dark:text-zinc-300">
                Completed today
              </p>
              <p className="font-['Poppins',_sans-serif] text-[20px] text-zinc-900 dark:text-zinc-100">
                {stats.completedToday}
              </p>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-[12px] bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-700/50">
              <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-700 dark:text-zinc-300">
                Completed this week
              </p>
              <p className="font-['Poppins',_sans-serif] text-[20px] text-zinc-900 dark:text-zinc-100">
                {stats.completedThisWeek}
              </p>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-[12px] bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-700/50">
              <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-700 dark:text-zinc-300">
                Completed this month
              </p>
              <p className="font-['Poppins',_sans-serif] text-[20px] text-zinc-900 dark:text-zinc-100">
                {stats.completedThisMonth}
              </p>
            </div>
          </div>
        </div>

        {/* By Priority */}
        <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-[16px] p-6 shadow-none dark:shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Flag className="size-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-['Poppins',_sans-serif] text-[18px] text-zinc-900 dark:text-zinc-100">
              By Priority
            </h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Flag className="size-[14px] text-red-600 dark:text-red-400 fill-red-600 dark:fill-red-400" />
                  <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-700 dark:text-zinc-300">
                    High Priority
                  </p>
                </div>
                <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
                  {stats.priorityStats.high.active} active · {stats.priorityStats.high.completed} completed
                </p>
              </div>
              <div className="w-full h-3 bg-red-100 dark:bg-zinc-700/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-600 dark:bg-red-500/80 transition-all duration-500"
                  style={{ width: `${stats.priorityStats.high.completed > 0 ? (stats.priorityStats.high.completed / (stats.priorityStats.high.active + stats.priorityStats.high.completed)) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Flag className="size-[14px] text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400" />
                  <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-700 dark:text-zinc-300">
                    Medium Priority
                  </p>
                </div>
                <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
                  {stats.priorityStats.medium.active} active · {stats.priorityStats.medium.completed} completed
                </p>
              </div>
              <div className="w-full h-3 bg-amber-100 dark:bg-zinc-700/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-600 dark:bg-amber-500/80 transition-all duration-500"
                  style={{ width: `${stats.priorityStats.medium.completed > 0 ? (stats.priorityStats.medium.completed / (stats.priorityStats.medium.active + stats.priorityStats.medium.completed)) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Flag className="size-[14px] text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400" />
                  <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-700 dark:text-zinc-300">
                    Low Priority
                  </p>
                </div>
                <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
                  {stats.priorityStats.low.active} active · {stats.priorityStats.low.completed} completed
                </p>
              </div>
              <div className="w-full h-3 bg-blue-100 dark:bg-zinc-700/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 dark:bg-blue-500/80 transition-all duration-500"
                  style={{ width: `${stats.priorityStats.low.completed > 0 ? (stats.priorityStats.low.completed / (stats.priorityStats.low.active + stats.priorityStats.low.completed)) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Label */}
        <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-[16px] p-6 shadow-none dark:shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Tag className="size-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-['Poppins',_sans-serif] text-[18px] text-zinc-900 dark:text-zinc-100">
              By Label
            </h3>
          </div>
          
          <div className="space-y-4 max-h-[250px] overflow-y-auto scrollbar-visible pr-2">
            {Object.keys(stats.labelStats).length > 0 ? (
              Object.entries(stats.labelStats)
                .sort((a, b) => (b[1].active + b[1].completed) - (a[1].active + a[1].completed))
                .map(([label, data]) => {
                  const config = getCategoryConfig(label);
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`size-[8px] rounded-full ${config?.dotColor || 'bg-zinc-500'}`} />
                          <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-700 dark:text-zinc-300">
                            {label}
                          </p>
                        </div>
                        <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
                          {data.active} active · {data.completed} completed
                        </p>
                      </div>
                      <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-700/50 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${config?.dotColor || 'bg-zinc-500'}`}
                          style={{ width: `${data.completed > 0 ? (data.completed / (data.active + data.completed)) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-8">
                <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-400 dark:text-zinc-500">
                  No labels assigned yet
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Completion Trends */}
        <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-[16px] p-6 shadow-none dark:shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="size-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-['Poppins',_sans-serif] text-[18px] text-zinc-900 dark:text-zinc-100">
              Completion Trends
            </h3>
          </div>
          
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.last7Days} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  className="text-zinc-600 dark:text-zinc-400"
                  axisLine={{ stroke: 'currentColor', strokeWidth: 0.5 }}
                  tickLine={{ stroke: 'currentColor', strokeWidth: 0.5 }}
                />
                <YAxis 
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  className="text-zinc-600 dark:text-zinc-400"
                  axisLine={{ stroke: 'currentColor', strokeWidth: 0.5 }}
                  tickLine={{ stroke: 'currentColor', strokeWidth: 0.5 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ fontFamily: 'Poppins, sans-serif', marginBottom: '4px' }}
                  itemStyle={{ fontFamily: 'Poppins, sans-serif' }}
                  formatter={(value) => [`${value} tasks`, 'Completed']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.last7Days.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isToday ? '#0ea5e9' : '#94a3b8'}
                      opacity={entry.isToday ? 1 : 0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="font-['Poppins',_sans-serif] text-[12px] text-zinc-500 dark:text-zinc-400 text-center mt-2">
            Last 7 days · {stats.completedThisWeek} tasks completed this week
          </p>
        </div>
      </div>
    </div>
  );
}
