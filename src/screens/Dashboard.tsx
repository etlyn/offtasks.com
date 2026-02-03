import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { TaskDialog } from "@/components/TaskDialog";
import { CompletedTasksSheet } from "@/components/CompletedTasksSheet";
import { TaskHistorySheet } from "@/components/TaskHistorySheet";
import { StatsSheet } from "@/components/StatsSheet";
import { SettingsSheet } from "@/components/SettingsSheet";
import { QuickView } from "@/components/QuickView";
import { CompletedView } from "@/components/CompletedView";
import { AnalyticsView } from "@/components/AnalyticsView";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Task } from "@/types/task";
import type { TaskGroup } from "@/types/supabase";
import { useAuth } from "@/providers/auth";
import {
  createTask,
  deleteTask as deleteTaskFromSupabase,
  fetchAllTasks,
  supabaseClient,
  updateTask,
} from "@/lib/supabase";
import { fromSupabaseTask, priorityLabelToNumber } from "@/utils/taskMapping";
import { getCurrentDate } from "@/hooks/useDate";

const CATEGORIES_STORAGE_KEY = "offtasks-categories";
const THEME_STORAGE_KEY = "offtasks-theme";
const ADVANCED_STORAGE_KEY = "offtasks-advanced-mode";
const HIDE_COMPLETED_STORAGE_KEY = "offtasks-hide-completed";

const DEFAULT_CATEGORIES = ["Work", "Personal", "Home", "Shopping", "Health", "Finance"];

type DialogCategory = "today" | "tomorrow" | "upcoming";

type TabId = "quick-view" | "completed" | "analytics";

export const DashboardScreen = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved ? saved === "dark" : true;
  });

  const [availableCategories, setAvailableCategories] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_CATEGORIES;
    }

    const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed;
        }
      } catch (error) {
        console.warn("Failed to parse stored categories", error);
      }
    }

    return DEFAULT_CATEGORIES;
  });

  const [advancedMode, setAdvancedMode] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const saved = localStorage.getItem(ADVANCED_STORAGE_KEY);
    return saved ? saved === "true" : false;
  });

  const [hideCompleted, setHideCompleted] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const saved = localStorage.getItem(HIDE_COMPLETED_STORAGE_KEY);
    return saved ? saved === "true" : false;
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [dialogCategory, setDialogCategory] = useState<DialogCategory>("today");
  const [completedSheetOpen, setCompletedSheetOpen] = useState(false);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [statsSheetOpen, setStatsSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabId>("quick-view");

  const refreshTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      return;
    }

    setIsLoadingTasks(true);
    try {
      const data = await fetchAllTasks();
      const mapped = data.map(fromSupabaseTask);
      setTasks(mapped);

      const labels = new Set<string>();
      mapped.forEach((task) => {
        if (task.label) {
          labels.add(task.label);
        }
      });

      if (labels.size) {
  setAvailableCategories((prev: string[]) => {
          const merged = Array.from(new Set([...prev, ...labels]));
          localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(merged));
          return merged;
        });
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [user]);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(ADVANCED_STORAGE_KEY, advancedMode.toString());
  }, [advancedMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(HIDE_COMPLETED_STORAGE_KEY, hideCompleted.toString());
  }, [hideCompleted]);

  const handleAddTask = useCallback((category: DialogCategory) => {
    setEditingTask(null);
    setDialogCategory(category);
    setDialogOpen(true);
  }, []);

  useEffect(() => {
    const handleQuickAdd = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (isTypingTarget) {
        return;
      }

      const isQuickAdd = (event.metaKey || event.ctrlKey) && (event.key === "+" || event.key === "=");
      if (isQuickAdd) {
        event.preventDefault();
        handleAddTask("today");
      }
    };

    window.addEventListener("keydown", handleQuickAdd);
    return () => window.removeEventListener("keydown", handleQuickAdd);
  }, [handleAddTask]);

  const handleEditTask = (id: string) => {
  const task = tasks.find((t: Task) => t.id === id);
    if (task) {
      setEditingTask(task);
      setDialogCategory((task.category as DialogCategory) ?? "today");
      setDialogOpen(true);
    }
  };

  const handleSaveTask = async (
    text: string,
    category: string,
    priority?: "low" | "medium" | "high",
    label?: string
  ) => {
    if (!user) {
      return;
    }

    const targetGroup = (category as TaskGroup) ?? "today";
    const priorityValue = priorityLabelToNumber(priority);

    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          content: text,
          targetGroup,
          priority: priorityValue,
          isComplete: editingTask.completed,
          label: label ?? null,
        });
      } else {
        await createTask({
          content: text,
          targetGroup,
          priority: priorityValue,
          label: label ?? null,
        });
      }

      if (label && !availableCategories.includes(label)) {
  setAvailableCategories((prev: string[]) => {
          const next = [...prev, label];
          localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      }

      await refreshTasks();
    } catch (error) {
      console.error("Failed to save task", error);
    }
  };

  const handleToggleTask = async (id: string) => {
  const task = tasks.find((t: Task) => t.id === id);
    if (!task) {
      return;
    }

    const nextCompleted = !task.completed;

    try {
      await updateTask(task.id, {
        isComplete: nextCompleted,
        completedAt: nextCompleted ? getCurrentDate() : null,
      });
      await refreshTasks();
    } catch (error) {
      console.error("Failed to toggle task", error);
    }
  };

  const handleDeleteTask = async () => {
    if (!editingTask) {
      return;
    }

    try {
      await deleteTaskFromSupabase(editingTask.id);
      await refreshTasks();
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  };

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    setTasks([]);
    navigate("/login");
  };

  const totalCompleted = useMemo(() => tasks.filter((t: Task) => t.completed).length, [tasks]);
  const totalTasks = tasks.length;

  const renderTabs = () => (
    <Tabs
      defaultValue="quick-view"
      value={currentTab}
  onValueChange={(value: string) => setCurrentTab(value as TabId)}
      className="w-full"
    >
      {currentTab !== "quick-view" && (
        <div className="mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentTab("quick-view")}
            className="size-16 rounded-full border border-white/40 dark:border-zinc-700/60 bg-white/60 dark:bg-zinc-800/50 backdrop-blur-md shadow-[0px_14px_34px_rgba(0,0,0,0.16)] hover:bg-white/80 dark:hover:bg-zinc-700/60"
          >
            <ArrowLeft className="size-[22px]" />
          </Button>
        </div>
      )}

      <TabsContent value="quick-view" className="mt-0">
        <QuickView
          tasks={tasks}
          onToggleTask={handleToggleTask}
          onEditTask={handleEditTask}
          advancedMode={advancedMode}
          hideCompleted={hideCompleted}
          onToggleHideCompleted={setHideCompleted}
        />
      </TabsContent>

      <TabsContent value="completed" className="mt-0">
        <CompletedView tasks={tasks} isDark={isDark} />
      </TabsContent>

      <TabsContent value="analytics" className="mt-0">
        <AnalyticsView tasks={tasks} />
      </TabsContent>
    </Tabs>
  );

  const renderEmptyState = () => (
    <div className="flex flex-1 items-center justify-center py-24 text-center">
      <div className="space-y-3">
        <p className="font-['Poppins',_sans-serif] text-[18px] text-zinc-500 dark:text-zinc-400">
          {isLoadingTasks ? "Loading your tasks..." : "Create your first task to get started."}
        </p>
        {!isLoadingTasks && (
          <Button variant="secondary" onClick={() => handleAddTask("today")}>
            Add Task
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-zinc-50 via-white to-zinc-100/80 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-800/30 min-h-screen relative transition-colors duration-300">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.03),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_50%_120%,rgba(14,165,233,0.05),rgba(0,0,0,0))] pointer-events-none" />

      <div className="relative z-10">
        <Header
          totalCompleted={totalCompleted}
          totalTasks={totalTasks}
          isDark={isDark}
          onToggleTheme={() => setIsDark((prev: boolean) => !prev)}
          onLogout={handleLogout}
          advancedMode={advancedMode}
          hideCompleted={hideCompleted}
          onToggleAdvancedMode={() => setAdvancedMode((prev: boolean) => !prev)}
          onToggleHideCompleted={setHideCompleted}
          onOpenSearch={() => {
            setCurrentTab("quick-view");
            setAdvancedMode(true);
          }}
          onViewQuickView={() => setCurrentTab("quick-view")}
          onViewCompleted={() => setCurrentTab("completed")}
          onViewAnalytics={() => setCurrentTab("analytics")}
          onViewHistory={() => setHistorySheetOpen(true)}
          onViewStats={() => setStatsSheetOpen(true)}
          onViewSettings={() => setSettingsSheetOpen(true)}
          userEmail={user?.email ?? undefined}
          userName={(user?.user_metadata as { full_name?: string } | null)?.full_name}
        />

        <div className="px-[40px] md:px-[80px] py-[32px] pb-[120px]">
          {tasks.length === 0 && !isLoadingTasks ? renderEmptyState() : renderTabs()}
        </div>

        <button
          onClick={() => handleAddTask("today")}
          className="fixed bottom-[100px] right-[40px] md:right-[80px] px-[24px] py-[14px] bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 rounded-full shadow-md hover:shadow-lg dark:shadow-lg dark:hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-[10px] group z-50"
          title="Add new task (⌘+)"
        >
          <svg className="size-[20px]" fill="none" viewBox="0 0 24 24">
            <path d="M12 5V19" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
            <path d="M5 12H19" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          </svg>
          <span className="font-['Poppins',_sans-serif] text-[14px] text-white">Add New Task</span>
        </button>

        <div className="fixed bottom-0 left-0 right-0 box-border flex gap-[10px] items-center justify-between px-[40px] md:px-[80px] py-[24px] border-t-[0.5px] border-zinc-300 dark:border-zinc-700/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.2)]">
          <p className="font-['Poppins',_sans-serif] leading-[1.3] not-italic text-[14px] text-nowrap text-zinc-400 tracking-[0.14px] whitespace-pre">
            © {new Date().getFullYear()} offtasks.com
          </p>
          <p className="hidden md:block font-['Poppins',_sans-serif] leading-[1.3] not-italic text-[12px] text-zinc-400">
            <kbd className="px-[6px] py-[2px] bg-zinc-200 dark:bg-zinc-700 rounded-[4px] text-[11px]">⌘+</kbd> Quick add
          </p>
        </div>

        <TaskDialog
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask}
          onDelete={editingTask ? handleDeleteTask : undefined}
          initialText={editingTask?.text}
          initialCategory={dialogCategory}
          initialPriority={editingTask?.priority}
          initialLabel={editingTask?.label}
          availableCategories={availableCategories}
          isEditing={!!editingTask}
        />

        <CompletedTasksSheet
          isOpen={completedSheetOpen}
          onClose={() => setCompletedSheetOpen(false)}
          tasks={tasks}
          isDark={isDark}
        />

        <TaskHistorySheet
          isOpen={historySheetOpen}
          onClose={() => setHistorySheetOpen(false)}
          tasks={tasks}
          isDark={isDark}
        />

        <StatsSheet isOpen={statsSheetOpen} onClose={() => setStatsSheetOpen(false)} tasks={tasks} />

        <SettingsSheet
          isOpen={settingsSheetOpen}
          onClose={() => setSettingsSheetOpen(false)}
          isDark={isDark}
          onToggleTheme={() => setIsDark((prev: boolean) => !prev)}
        />
      </div>
    </div>
  );
};
