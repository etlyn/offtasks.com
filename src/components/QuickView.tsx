import { useState, useMemo } from "react";
import { TaskColumn } from "./TaskColumn";
import { Task } from "../types/task";
import { Search, Tag, X, ArrowUpDown } from "lucide-react";
import { Badge } from "./ui/badge";
import { getCategoryConfig, getDefaultCategoryColor } from "../utils/categoryConfig";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

interface QuickViewProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onEditTask: (id: string) => void;
  advancedMode: boolean;
}

export function QuickView({ tasks, onToggleTask, onEditTask, advancedMode }: QuickViewProps) {
  // Advanced mode states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [prioritySortDirection, setPrioritySortDirection] = useState<"asc" | "desc" | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);

  // Get all unique labels from tasks
  const allLabels = useMemo(() => {
    const labels = new Set<string>();
    tasks.forEach((task) => {
      if (task.label) {
        labels.add(task.label);
      }
    });
    return Array.from(labels).sort();
  }, [tasks]);

  // Filter tasks when advanced mode is enabled
  const filteredTasks = useMemo(() => {
    if (!advancedMode) return tasks;

    return tasks.filter((task) => {
      // Search filter
      if (searchQuery && !task.text.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Label filter
      if (selectedLabels.length > 0) {
        if (!task.label || !selectedLabels.includes(task.label)) {
          return false;
        }
      }

      // Completed filter
      if (!showCompleted && task.completed) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, selectedLabels, showCompleted, advancedMode]);

  // Sort tasks when advanced mode is enabled
  const sortedTasks = useMemo(() => {
    if (!advancedMode || !prioritySortDirection) return filteredTasks;

    const sorted = [...filteredTasks];
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    sorted.sort((a, b) => {
      const aPriority = a.priority || "low";
      const bPriority = b.priority || "low";
      const comparison = priorityOrder[aPriority] - priorityOrder[bPriority];
      return prioritySortDirection === "desc" ? comparison : -comparison;
    });
    
    return sorted;
  }, [filteredTasks, prioritySortDirection, advancedMode]);

  // Group by category (Today, Tomorrow, Upcoming)
  const displayTasks = advancedMode ? sortedTasks : tasks;
  const todayTasks = displayTasks.filter((t) => t.category === "today");
  const tomorrowTasks = displayTasks.filter((t) => t.category === "tomorrow");
  const upcomingTasks = displayTasks.filter((t) => t.category === "upcoming");

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    selectedLabels.length +
    (!showCompleted ? 1 : 0);

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedLabels([]);
    setPrioritySortDirection(null);
    setShowCompleted(true);
  };

  const toggleLabel = (label: string) => {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const togglePrioritySort = () => {
    setPrioritySortDirection((prev) => {
      if (prev === null) return "desc"; // First click: high to low
      if (prev === "desc") return "asc"; // Second click: low to high
      return null; // Third click: clear sorting
    });
  };

  return (
    <div className="space-y-6">
      {/* Advanced Filters Bar */}
      {advancedMode && (
        <div className="space-y-4">
          {/* Search and Filters - Single Row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Category Filter */}
            {allLabels.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 font-['Poppins',_sans-serif] text-[13px] bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 shadow-none dark:shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
                  >
                    <Tag className="size-[14px]" />
                    Categories
                    {selectedLabels.length > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[11px] h-[18px]">
                        {selectedLabels.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                  <DropdownMenuLabel className="font-['Poppins',_sans-serif] text-[12px]">
                    Filter by Category
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allLabels.map((label) => {
                    const config = getCategoryConfig(label) || getDefaultCategoryColor();
                    return (
                      <DropdownMenuCheckboxItem
                        key={label}
                        checked={selectedLabels.includes(label)}
                        onCheckedChange={() => toggleLabel(label)}
                        className="font-['Poppins',_sans-serif] text-[13px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`size-2 rounded-full ${config.dotColor}`} />
                          <span>{label}</span>
                        </div>
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Priority Sort */}
            <Button
              variant={prioritySortDirection ? "secondary" : "outline"}
              size="sm"
              onClick={togglePrioritySort}
              className="h-9 gap-2 font-['Poppins',_sans-serif] text-[13px] bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 shadow-none dark:shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-700"
            >
              <ArrowUpDown className="size-[14px]" />
              Priority
            </Button>

            {/* Hide Completed Toggle */}
            <Button
              variant={showCompleted ? "outline" : "secondary"}
              size="sm"
              onClick={() => setShowCompleted(!showCompleted)}
              className="h-9 gap-2 font-['Poppins',_sans-serif] text-[13px] bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 shadow-none dark:shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              {showCompleted ? "Hide" : "Show"} Completed
            </Button>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-9 gap-2 font-['Poppins',_sans-serif] text-[13px] text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <X className="size-[14px]" />
                Clear ({activeFilterCount})
              </Button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Search - Right Aligned */}
            <div className="relative w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-[16px] text-zinc-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-10 pr-4 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-[10px] font-['Poppins',_sans-serif] text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-none dark:shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:focus:border-sky-400 transition-all"
              />
            </div>
          </div>

          {/* Active Filters Display */}
          {(selectedLabels.length > 0 || searchQuery) && (
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <Badge
                  variant="secondary"
                  className="gap-1.5 pr-1 font-['Poppins',_sans-serif] text-[12px]"
                >
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-1 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-full p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {selectedLabels.map((label) => {
                const config = getCategoryConfig(label) || getDefaultCategoryColor();
                return (
                  <Badge
                    key={label}
                    variant="secondary"
                    className="gap-1.5 pr-1 font-['Poppins',_sans-serif] text-[12px]"
                  >
                    <span className={`size-2 rounded-full ${config.dotColor}`} />
                    {label}
                    <button
                      onClick={() => toggleLabel(label)}
                      className="ml-1 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-full p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Task Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[32px] max-w-[1520px] mx-auto">
        <TaskColumn
          title="Today"
          tasks={todayTasks}
          onToggleTask={onToggleTask}
          onEditTask={onEditTask}
          category="today"
          showMetadata={advancedMode}
        />
        <TaskColumn
          title="Tomorrow"
          tasks={tomorrowTasks}
          onToggleTask={onToggleTask}
          onEditTask={onEditTask}
          category="tomorrow"
          showMetadata={advancedMode}
        />
        <TaskColumn
          title="Upcoming"
          tasks={upcomingTasks}
          onToggleTask={onToggleTask}
          onEditTask={onEditTask}
          category="upcoming"
          showMetadata={advancedMode}
        />
      </div>
    </div>
  );
}
