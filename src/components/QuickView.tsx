import { useState, useMemo } from "react";
import { TaskColumn } from "./TaskColumn";
import { Task } from "../types/task";
import { Tag, X, ArrowUpDown } from "lucide-react";
import { Badge } from "./ui/badge";
import {
  getCategoryConfig,
  getDefaultCategoryColor,
} from "../utils/categoryConfig";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { SearchSectionBar } from "./SearchSectionBar";

interface QuickViewProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onEditTask: (id: string) => void;
  advancedMode: boolean;
  hideCompleted?: boolean;
  onToggleHideCompleted?: (value: boolean) => void;
}

export function QuickView({
  tasks,
  onToggleTask,
  onEditTask,
  advancedMode,
  hideCompleted,
  onToggleHideCompleted,
}: QuickViewProps) {
  // Advanced mode states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [prioritySortDirection, setPrioritySortDirection] = useState<
    "asc" | "desc" | null
  >(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const effectiveShowCompleted =
    typeof hideCompleted === "boolean" ? !hideCompleted : showCompleted;
  const applyFilters = advancedMode || hideCompleted === true;

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
    if (!applyFilters) return tasks;

    return tasks.filter((task) => {
      if (advancedMode) {
        // Search filter
        if (
          searchQuery &&
          !task.text.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }

        // Label filter
        if (selectedLabels.length > 0) {
          if (!task.label || !selectedLabels.includes(task.label)) {
            return false;
          }
        }
      }

      // Completed filter
      if (!effectiveShowCompleted && task.completed) {
        return false;
      }

      return true;
    });
  }, [
    advancedMode,
    applyFilters,
    effectiveShowCompleted,
    searchQuery,
    selectedLabels,
    tasks,
  ]);

  // Sort tasks when advanced mode is enabled
  const sortedTasks = useMemo(() => {
    if (!advancedMode || !prioritySortDirection) return filteredTasks;

    const sorted = [...filteredTasks];
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    sorted.sort((a, b) => {
      const aPriority = a.priority || "low";
      const bPriority = b.priority || "low";
      const comparison = priorityOrder[bPriority] - priorityOrder[aPriority];
      return prioritySortDirection === "desc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredTasks, prioritySortDirection, advancedMode]);

  // Group by category (Today, Tomorrow, Upcoming)
  const displayTasks = advancedMode ? sortedTasks : filteredTasks;
  const todayTasks = displayTasks.filter((t) => t.category === "today");
  const tomorrowTasks = displayTasks.filter((t) => t.category === "tomorrow");
  const upcomingTasks = displayTasks.filter((t) => t.category === "upcoming");

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    selectedLabels.length +
    (prioritySortDirection ? 1 : 0) +
    (!effectiveShowCompleted ? 1 : 0);

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedLabels([]);
    setPrioritySortDirection(null);
    if (typeof hideCompleted === "boolean") {
      onToggleHideCompleted?.(false);
    } else {
      setShowCompleted(true);
    }
  };

  const toggleShowCompleted = () => {
    if (typeof hideCompleted === "boolean") {
      onToggleHideCompleted?.(!hideCompleted);
      return;
    }
    setShowCompleted((prev) => !prev);
  };

  const toggleLabel = (label: string) => {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
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
                      <Badge
                        variant="secondary"
                        className="ml-1 px-1.5 py-0 text-[11px] h-[18px]"
                      >
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
                    const config =
                      getCategoryConfig(label) || getDefaultCategoryColor();
                    return (
                      <DropdownMenuCheckboxItem
                        key={label}
                        checked={selectedLabels.includes(label)}
                        onCheckedChange={() => toggleLabel(label)}
                        className="font-['Poppins',_sans-serif] text-[13px]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${config.dotColor}`}
                          />
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
              variant={effectiveShowCompleted ? "outline" : "secondary"}
              size="sm"
              onClick={toggleShowCompleted}
              className="h-9 gap-2 font-['Poppins',_sans-serif] text-[13px] bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 shadow-none dark:shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              {effectiveShowCompleted ? "Hide" : "Show"} Completed
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
            <SearchSectionBar
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery("")}
            />
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
                const config =
                  getCategoryConfig(label) || getDefaultCategoryColor();
                return (
                  <Badge
                    key={label}
                    variant="secondary"
                    className="gap-1.5 pr-1 font-['Poppins',_sans-serif] text-[12px]"
                  >
                    <span
                      className={`size-2 rounded-full ${config.dotColor}`}
                    />
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
          title="Later"
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
