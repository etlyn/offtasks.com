import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Head from "next/head";
import { LayoutGrid, CheckCircle2, BarChart3, SlidersHorizontal, Plus, Rocket } from "lucide-react";
import { Modal } from "@/components";
import { AppStateContext } from "@/providers/app-state";
import type { Task, TaskGroup } from "@/types";
import { useDate } from "@/hooks/useDate";
import { updateTask, supabaseClient } from "@/lib/supabase";
import { Sun, Moon } from "lucide-react";

type TabId = "quick" | "completed" | "analytics";

// Logo Component
const OfftasksLogo = () => (
  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
    <g>
      <path d="M24.9023 0C28.8222 0.000255618 31.9997 3.17784 32 7.09766V17.9492H0V7.09766C0.000254231 3.17784 3.17784 0.000256133 7.09766 0H24.9023Z" fill="#99F6E4" />
      <path d="M32 24.9014C32 28.8214 28.8223 31.9997 24.9023 32H7.09766C3.17768 31.9997 0 28.8214 0 24.9014V16.8701H32V24.9014Z" fill="#134E4A" />
      <g>
        <rect fill="#FAFAFA" height="24.0802" rx="5.07009" width="24.814" x="3.58887" y="3.08118" />
        <path
          clipRule="evenodd"
          d="M6.09939 8.90634C5.97674 8.98166 6.08936 9.14597 6.44 9.40333C8.63934 11.0177 9.68913 12.2692 13.5278 17.853C15.857 21.241 15.8325 21.2109 16.058 20.9668C16.1667 20.849 17.4386 18.9774 18.1596 17.874C19.5748 15.7085 20.4591 14.3904 20.7857 13.9599C21.9811 12.3843 22.952 11.327 24.6932 9.7049C25.3048 9.13506 25.321 8.95055 24.7451 9.11369C24.6648 9.13644 24.138 9.24652 23.5745 9.35827C19.9346 10.0802 17.8491 11.1801 16.5592 13.0583C16.0342 13.8228 15.9697 13.8421 15.6211 13.3384C14.1339 11.1893 11.7872 9.9494 7.74639 9.1779C7.3324 9.09884 6.8149 8.9974 6.5964 8.95246C6.13435 8.85747 6.17308 8.86108 6.09939 8.90634Z"
          fill="#134E4A"
          fillRule="evenodd"
        />
      </g>
    </g>
  </svg>
);

// Theme Switch Component
const ThemeSwitch = () => {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  if (!mounted) {
    return <div className="size-[24px]" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative size-[24px] rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-all"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="size-[15px] text-zinc-100" />
      ) : (
        <Moon className="size-[15px] text-zinc-900" />
      )}
    </button>
  );
};

// ProfileMenu Component
const ProfileMenu = ({ user }: { user?: { email: string; name?: string } }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = () => {
    if (!user?.email) return "JD";
    const email = user.email;
    const parts = email.split("@")[0].split(".");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    const { supabaseClient } = await import("@/lib/supabase");
    await supabaseClient.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="size-[44px] rounded-full border-2 border-zinc-400/40 dark:border-zinc-600/40 bg-zinc-700 dark:bg-zinc-700 flex items-center justify-center text-white hover:border-zinc-500 dark:hover:border-zinc-500 transition"
      >
        <span className="font-['Poppins',_sans-serif] text-[16px]">{getInitials()}</span>
      </button>
      {showMenu && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[200px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50">
          {user?.email && (
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400">Signed in as</p>
              <p className="text-[14px] text-zinc-900 dark:text-zinc-100 truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 text-left text-[14px] text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

// Task Item Component
const TaskItem = ({ 
  task, 
  onToggle, 
  onEdit 
}: { 
  task: Task; 
  onToggle: () => void;
  onEdit: () => void;
}) => {
  const isHighPriority = task.priority && task.priority >= 2;
  const { today } = useDate();
  const taskDate = task.date ?? "";
  const isOverdue = !task.isComplete && taskDate !== "" && taskDate < today;

  return (
    <div className="flex items-start gap-[8px] w-full">
      <button
        onClick={onToggle}
        className="flex-shrink-0 size-[24px] p-[2px] flex items-center justify-center group"
      >
        <div className="size-[20px] rounded-[5px] border-2 border-zinc-400 dark:border-zinc-500 group-hover:border-sky-500 dark:group-hover:border-sky-400 transition flex items-center justify-center bg-transparent group-hover:bg-sky-50 dark:group-hover:bg-sky-950/30">
          {task.isComplete && (
            <>
              <div className="absolute size-[20px] rounded-[5px] bg-sky-500 dark:bg-sky-600" />
              <svg className="relative size-[12px] z-10" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8.5L6.5 12L13 4.5"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </div>
      </button>
      <button
        onClick={onEdit}
        className={`flex-1 text-left font-['Poppins',_sans-serif] text-[16px] leading-[1.4] hover:opacity-70 transition ${
          task.isComplete
            ? "line-through text-zinc-500 dark:text-zinc-500"
            : isHighPriority || isOverdue
            ? "text-red-500 dark:text-red-400"
            : "text-zinc-900 dark:text-zinc-100"
        }`}
      >
        {task.content}
      </button>
    </div>
  );
};

// Task Column Component
const TaskColumn = ({
  title,
  tasks,
  onToggleTask,
  onEditTask,
}: {
  title: string;
  tasks: Task[];
  onToggleTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
}) => {
  const completedCount = tasks.filter((t) => t.isComplete).length;
  const totalCount = tasks.length;

  return (
    <div className="border border-zinc-300/40 dark:border-zinc-700/40 rounded-[16px] p-[25px] h-[805px] flex flex-col">
      <div className="border-b border-zinc-700 pb-[16px] mb-[24px]">
        <p className="font-['Poppins',_sans-serif] text-[16px] leading-[1.4] text-zinc-900 dark:text-zinc-100">
          {title} - {completedCount} of {totalCount}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto space-y-[16px] pr-[4px] scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={() => onToggleTask(task)}
            onEdit={() => onEditTask(task)}
          />
        ))}
      </div>
    </div>
  );
};

const Home = () => {
  const { appState } = useContext(AppStateContext);
  const initialRef = useRef<HTMLTextAreaElement | null>(null);
  const [modalTask, setModalTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [targetGroup, setTargetGroup] = useState<TaskGroup>("today");
  const [activeTab, setActiveTab] = useState<TabId>("quick");
  const [showFilters, setShowFilters] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const { today } = useDate();

  useEffect(() => {
    const currentUser = supabaseClient.auth.user();
    if (currentUser) {
      setUser({ email: currentUser.email ?? "" });
    }
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setModalTask(null);
  }, []);

  const openModal = useCallback((clickedTask: Task | null, group: TaskGroup = "today") => {
    setModalTask(clickedTask);
    setTargetGroup(group);
    setShowModal(true);
  }, []);

  const handleKeyboardEvent = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "+") {
        event.preventDefault();
        openModal(null, "today");
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }
    },
    [closeModal, openModal]
  );

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyboardEvent(event);

    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, [handleKeyboardEvent]);

  const handleToggleTask = useCallback(
    async (task: Task) => {
      const nextStatus = !task.isComplete;
      const desiredGroup = (task.target_group ?? "today") as TaskGroup;

      try {
        await updateTask(
          task.id,
          task.content,
          nextStatus,
          task.priority,
          desiredGroup,
          task.date
        );

        if (appState?.refreshTasks) {
          await appState.refreshTasks();
        }
      } catch (error) {
        console.error("Failed to toggle task", error);
      }
    },
    [appState]
  );

  const handleEditTask = useCallback(
    (task: Task) => {
      const derivedGroup = (task.target_group ?? "today") as TaskGroup;
      openModal(task, derivedGroup);
    },
    [openModal]
  );

  const completedCount = appState?.completedTasks ?? appState?.closedTasks.length ?? 0;
  const totalCount = appState?.totalTasks ?? 
    (appState?.todayTasks.length ?? 0) + 
    (appState?.tomorrowTasks.length ?? 0) + 
    (appState?.upcomingTasks.length ?? 0) + 
    (appState?.closedTasks.length ?? 0);

  const todayTasks = appState?.todayTasks ?? [];
  const tomorrowTasks = appState?.tomorrowTasks ?? [];
  const upcomingTasks = appState?.upcomingTasks ?? [];

  const tabs: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
    { id: "quick", label: "Quick View", icon: LayoutGrid },
    { id: "completed", label: "Completed", icon: CheckCircle2 },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <>
      <Head>
        <title>Offtasks - Task Management</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      {showModal && (
        <Modal
          selectedGroup={targetGroup}
          closeModal={closeModal}
          initialRef={initialRef}
          task={modalTask}
        />
      )}

      <div className="min-h-screen bg-zinc-950 relative">
        {/* Background Gradient */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 120%, rgba(14, 165, 233, 0.05) 0%, rgba(0, 0, 0, 0) 100%)"
          }}
        />

        {/* Header */}
        <header className="relative z-10 bg-zinc-800/80 backdrop-blur-sm border-b-[0.5px] border-zinc-700/50 px-[80px] py-[22px]">
          <div className="flex items-center justify-between">
            <div className="size-[32px]">
              <OfftasksLogo />
            </div>

            <button
              onClick={() => setActiveTab("completed")}
              className="flex items-center gap-[8px] hover:opacity-70 transition"
            >
              <Rocket className="size-[24px] text-zinc-100" />
              <p className="font-['Poppins',_sans-serif] text-[16px] leading-[1.4] text-zinc-100">
                {completedCount} of {totalCount}
              </p>
            </button>

            <div className="flex items-center gap-[16px]">
              <ThemeSwitch />
              <ProfileMenu user={user ?? undefined} />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="relative z-10 px-[80px] pt-[32px] pb-[120px]">
          {/* Tabs */}
          <div className="mb-[56px]">
            <div className="flex items-center justify-between border-b border-zinc-700/60 pb-0">
              <div className="flex gap-[4px]">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-[8px] px-[16px] py-[14px] rounded-t-[14px] transition-all ${
                        isActive
                          ? "bg-transparent text-sky-400"
                          : "bg-transparent text-zinc-400 hover:text-zinc-300"
                      }`}
                    >
                      <Icon className="size-[15px]" />
                      <span className="font-['Poppins',_sans-serif] text-[14px] leading-[1.5]">
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeTab === "quick" && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-[8px] px-[11px] py-[11px] bg-zinc-800 border border-zinc-600 rounded-[8px] hover:bg-zinc-700 transition mb-[12px]"
                >
                  <SlidersHorizontal className="size-[14px] text-zinc-50" />
                  <span className="font-['Poppins',_sans-serif] text-[13px] text-zinc-50">
                    Show Filters
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Quick View - 3 Columns */}
          {activeTab === "quick" && (
            <div className="grid grid-cols-3 gap-[42px]">
              <TaskColumn
                title="Today"
                tasks={todayTasks}
                onToggleTask={handleToggleTask}
                onEditTask={handleEditTask}
              />
              <TaskColumn
                title="Tomorrow"
                tasks={tomorrowTasks}
                onToggleTask={handleToggleTask}
                onEditTask={handleEditTask}
              />
              <TaskColumn
                title="Upcoming"
                tasks={upcomingTasks}
                onToggleTask={handleToggleTask}
                onEditTask={handleEditTask}
              />
            </div>
          )}

          {/* Completed View */}
          {activeTab === "completed" && (
            <div className="text-center py-20">
              <CheckCircle2 className="size-16 mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-400 text-lg">Completed tasks view</p>
            </div>
          )}

          {/* Analytics View */}
          {activeTab === "analytics" && (
            <div className="text-center py-20">
              <BarChart3 className="size-16 mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-400 text-lg">Analytics view</p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="fixed bottom-0 left-0 right-0 z-10 bg-zinc-900/70 backdrop-blur-md border-t-[0.5px] border-zinc-700/50 px-[80px] py-[24px]">
          <p className="font-['Poppins',_sans-serif] text-[14px] leading-[1.3] text-zinc-400 tracking-[0.14px]">
            © 2025 offtasks.com
          </p>
        </footer>

        {/* Add New Task Button */}
        <button
          onClick={() => openModal(null, "today")}
          className="fixed bottom-[90px] right-[80px] z-20 flex items-center gap-[10px] px-[24px] py-[14px] bg-sky-500 hover:bg-sky-600 rounded-full shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] transition-all"
        >
          <Plus className="size-[20px] text-white" />
          <span className="font-['Poppins',_sans-serif] text-[14px] text-white">
            Add New Task
          </span>
        </button>
      </div>
    </>
  );
};

export default Home;
