import React, { useMemo, useState, useEffect } from "react";
import { Filter, Search, X } from "lucide-react";
import type { DashboardTask } from "@/components/dashboard/types";
import { TaskColumn } from "@/components/dashboard/TaskColumn";

interface QuickViewProps {
  today: DashboardTask[];
  tomorrow: DashboardTask[];
  upcoming: DashboardTask[];
  onToggleTask: (task: DashboardTask) => void;
  onEditTask: (task: DashboardTask) => void;
  advancedMode?: boolean;
}

type PriorityFilter = "all" | "high" | "medium" | "low";

const sortTasks = (tasks: DashboardTask[]) => {
  return [...tasks].sort((a, b) => {
    if (a.completed === b.completed) {
      return a.text.localeCompare(b.text);
    }
    return a.completed ? 1 : -1;
  });
};

const applyFilters = (
  tasks: DashboardTask[],
  searchValue: string,
  priority: PriorityFilter,
  hideCompleted: boolean
) => {
  return sortTasks(tasks).filter((task) => {
    if (searchValue && !task.text.toLowerCase().includes(searchValue.toLowerCase())) {
      return false;
    }
    if (hideCompleted && task.completed) {
      return false;
    }
    if (priority !== "all" && task.priority !== priority) {
      return false;
    }
    return true;
  });
};

export function QuickView({ today, tomorrow, upcoming, onToggleTask, onEditTask, advancedMode = false }: QuickViewProps) {
  const [filtersVisible, setFiltersVisible] = useState(advancedMode);
  const [searchValue, setSearchValue] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [hideCompleted, setHideCompleted] = useState(false);

  // Sync filtersVisible with advancedMode prop
  useEffect(() => {
    setFiltersVisible(advancedMode);
  }, [advancedMode]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchValue) count += 1;
    if (priorityFilter !== "all") count += 1;
    if (hideCompleted) count += 1;
    return count;
  }, [searchValue, priorityFilter, hideCompleted]);

  const filteredToday = useMemo(
    () => applyFilters(today, searchValue, priorityFilter, hideCompleted),
    [today, searchValue, priorityFilter, hideCompleted]
  );
  const filteredTomorrow = useMemo(
    () => applyFilters(tomorrow, searchValue, priorityFilter, hideCompleted),
    [tomorrow, searchValue, priorityFilter, hideCompleted]
  );
  const filteredUpcoming = useMemo(
    () => applyFilters(upcoming, searchValue, priorityFilter, hideCompleted),
    [upcoming, searchValue, priorityFilter, hideCompleted]
  );

  const handleClearFilters = () => {
    setSearchValue("");
    setPriorityFilter("all");
    setHideCompleted(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Quick View</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Stay in sync across today, tomorrow, and upcoming work.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFiltersVisible((previous) => !previous)}
          className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/70 px-4 py-2 text-sm font-medium text-zinc-600 shadow-[0_12px_30px_rgba(14,165,233,0.12)] transition hover:-translate-y-0.5 hover:shadow-soft-md focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-zinc-700/60 dark:bg-zinc-900/60 dark:text-zinc-200"
        >
          <Filter className="h-4 w-4" />
          {filtersVisible ? "Hide Filters" : "Show Filters"}
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-500 dark:bg-sky-500/20 dark:text-sky-300">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {filtersVisible ? (
        <div className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/80 px-6 py-5 shadow-[0_24px_60px_rgba(59,130,246,0.12)] backdrop-blur-2xl transition dark:border-zinc-700/60 dark:bg-zinc-900/70">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search tasks"
                className="w-full rounded-2xl border border-white/60 bg-white/90 py-3 pl-10 pr-4 text-sm text-zinc-700 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:border-zinc-700/60 dark:bg-zinc-900/70 dark:text-zinc-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setHideCompleted((previous) => !previous)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                  hideCompleted
                    ? "bg-sky-500 text-white shadow-[0_12px_28px_rgba(14,165,233,0.24)]"
                    : "border border-white/60 bg-white/90 text-zinc-600 hover:border-sky-200 hover:text-sky-500 dark:border-zinc-700/60 dark:bg-zinc-900/70 dark:text-zinc-200"
                }`}
              >
                {hideCompleted ? "Completed hidden" : "Hide completed"}
              </button>

              <div className="flex items-center gap-2">
                {["all", "high", "medium", "low"].map((option) => {
                  const typedOption = option as PriorityFilter;
                  const isActive = priorityFilter === typedOption;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPriorityFilter(typedOption)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                        isActive
                          ? "bg-sky-500 text-white shadow-[0_12px_28px_rgba(14,165,233,0.24)]"
                          : "border border-white/60 bg-white/90 text-zinc-500 hover:border-sky-200 hover:text-sky-500 dark:border-zinc-700/60 dark:bg-zinc-900/70 dark:text-zinc-300"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="flex items-center gap-1 rounded-xl border border-transparent bg-red-50 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <TaskColumn
          title="Today"
          tasks={filteredToday}
          onToggle={onToggleTask}
          onEdit={onEditTask}
          emptyMessage="You're all set for today."
          showPriority={filtersVisible}
        />
        <TaskColumn
          title="Tomorrow"
          tasks={filteredTomorrow}
          onToggle={onToggleTask}
          onEdit={onEditTask}
          emptyMessage="Nothing planned for tomorrow yet."
          showPriority={filtersVisible}
        />
        <TaskColumn
          title="Upcoming"
          tasks={filteredUpcoming}
          onToggle={onToggleTask}
          onEdit={onEditTask}
          emptyMessage="Plan ahead by adding upcoming work."
          showPriority={filtersVisible}
        />
      </div>
    </div>
  );
};
