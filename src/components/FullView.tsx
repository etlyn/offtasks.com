import { useState, useMemo } from "react";
import { Task } from "../types/task";
import { TaskColumn } from "./TaskColumn";
import { Search, Filter, Tag, SlidersHorizontal, X, ArrowUpDown } from "lucide-react";
import { Badge } from "./ui/badge";
import { getCategoryConfig, getDefaultCategoryColor } from "../utils/categoryConfig";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

interface FullViewProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onEditTask: (id: string) => void;
}

type GroupBy = "none" | "priority" | "labels" | "status";
type SortBy = "default" | "priority" | "alphabetical";

export function FullView({ tasks, onToggleTask, onEditTask }: FullViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [sortBy, setSortBy] = useState<SortBy>("default");
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

  // Filter tasks based on search, labels
  const filteredTasks = useMemo(() => {
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
  }, [tasks, searchQuery, selectedLabels, showCompleted]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];
    
    // Priority sorting takes precedence
    if (prioritySortDirection) {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      sorted.sort((a, b) => {
        const aPriority = a.priority || "low";
        const bPriority = b.priority || "low";
        const comparison = priorityOrder[aPriority] - priorityOrder[bPriority];
        return prioritySortDirection === "desc" ? comparison : -comparison;
      });
    } else if (sortBy === "priority") {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      sorted.sort((a, b) => {
        const aPriority = a.priority || "low";
        const bPriority = b.priority || "low";
        return priorityOrder[aPriority] - priorityOrder[bPriority];
      });
    } else if (sortBy === "alphabetical") {
      sorted.sort((a, b) => a.text.localeCompare(b.text));
    }
    
    return sorted;
  }, [filteredTasks, sortBy, prioritySortDirection]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    if (groupBy === "none") {
      return {
        today: sortedTasks.filter((t) => t.category === "today"),
        tomorrow: sortedTasks.filter((t) => t.category === "tomorrow"),
        upcoming: sortedTasks.filter((t) => t.category === "upcoming"),
      };
    }

    if (groupBy === "priority") {
      return {
        high: sortedTasks.filter((t) => t.priority === "high"),
        medium: sortedTasks.filter((t) => t.priority === "medium"),
        low: sortedTasks.filter((t) => !t.priority || t.priority === "low"),
      };
    }

    if (groupBy === "status") {
      return {
        active: sortedTasks.filter((t) => !t.completed),
        completed: sortedTasks.filter((t) => t.completed),
      };
    }

    if (groupBy === "labels") {
      const groups: Record<string, Task[]> = { unlabeled: [] };
      
      sortedTasks.forEach((task) => {
        if (!task.label) {
          groups.unlabeled.push(task);
        } else {
          if (!groups[task.label]) {
            groups[task.label] = [];
          }
          groups[task.label].push(task);
        }
      });
      
      return groups;
    }

    return {};
  }, [sortedTasks, groupBy]);

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30";
      case "medium":
        return "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30";
      case "low":
        return "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30";
      default:
        return "bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400 border-zinc-200 dark:border-zinc-500/30";
    }
  };

  const getGroupLabel = (key: string) => {
    if (groupBy === "none") {
      return key.charAt(0).toUpperCase() + key.slice(1);
    }
    if (groupBy === "priority") {
      return key.charAt(0).toUpperCase() + key.slice(1) + " Priority";
    }
    if (groupBy === "status") {
      return key.charAt(0).toUpperCase() + key.slice(1);
    }
    if (groupBy === "labels") {
      return key === "unlabeled" ? "No Labels" : key;
    }
    return key;
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="space-y-4 mb-6">
        {/* Search and Filters - Single Row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Category Filter */}
          {allLabels.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2 font-['Poppins',_sans-serif] text-[13px] bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
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
            className="h-9 gap-2 font-['Poppins',_sans-serif] text-[13px] bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-700"
          >
            <ArrowUpDown className="size-[14px]" />
            Priority
          </Button>

          {/* Hide Completed Toggle */}
          <Button
            variant={showCompleted ? "outline" : "secondary"}
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
            className="h-9 gap-2 font-['Poppins',_sans-serif] text-[13px] bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
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
              className="w-full h-9 pl-10 pr-4 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-[10px] font-['Poppins',_sans-serif] text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:focus:border-sky-400 transition-all"
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

      {/* Task Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(groupedTasks).map(([key, groupTasks]) => (
          <TaskColumn
            key={key}
            title={getGroupLabel(key)}
            tasks={groupTasks}
            category={key as any}
            onToggleTask={onToggleTask}
            onEditTask={onEditTask}
            showMetadata={true}
          />
        ))}
      </div>

      {/* Empty State */}
      {Object.values(groupedTasks).every((group) => group.length === 0) && (
        <div className="text-center py-20">
          <Filter className="size-16 mx-auto mb-4 text-zinc-300 dark:text-zinc-600" />
          <p className="font-['Poppins',_sans-serif] text-[16px] text-zinc-400 dark:text-zinc-500">
            No tasks match your filters
          </p>
          <Button
            variant="link"
            onClick={clearAllFilters}
            className="mt-2 font-['Poppins',_sans-serif] text-[14px]"
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}
