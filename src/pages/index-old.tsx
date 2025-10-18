import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Head from "next/head";
import { LayoutGrid, CheckCircle2, BarChart3, SlidersHorizontal, Plus } from "lucide-react";
import { Modal } from "@/components";
import { AppStateContext } from "@/providers/app-state";
import type { Task, TaskGroup } from "@/types";
import { useDate } from "@/hooks/useDate";
import { updateTask, supabaseClient } from "@/lib/supabase";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

type TabId = "quick" | "completed" | "analytics";

interface DashboardBuckets {
  today: DashboardTask[];
  tomorrow: DashboardTask[];
  upcoming: DashboardTask[];
  completed: DashboardTask[];
}

const derivePriority = (priority: number | null | undefined): DashboardTask["priority"] => {
  if (priority !== null && priority !== undefined) {
    if (priority >= 2) {
      return "high";
    }
    if (priority === 1) {
      return "medium";
    }
  }
  return "low";
};

const Home = () => {
  const { appState } = useContext(AppStateContext);
  const initialRef = useRef<HTMLTextAreaElement | null>(null);
  const [modalTask, setModalTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [targetGroup, setTargetGroup] = useState<TaskGroup>("today");
  const [activeTab, setActiveTab] = useState<TabId>("quick");
  const [showFilters, setShowFilters] = useState(false);
  const { today } = useDate();
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const toDashboardTask = useCallback(
    (task: Task): DashboardTask => {
      const group = (task.target_group ?? "today") as TaskGroup;
      const taskDate = task.date ?? "";
      const isOverdue = !task.isComplete && taskDate !== "" && taskDate < today;

      return {
        id: task.id,
        text: task.content,
        completed: task.isComplete,
        overdue: isOverdue,
        priority: derivePriority(task.priority),
        category: group,
        date: taskDate,
        raw: task,
      };
    },
    [today]
  );

  const dashboardData: DashboardBuckets = useMemo(() => {
    if (!appState) {
      return {
        today: [],
        tomorrow: [],
        upcoming: [],
        completed: [],
      };
    }

    return {
      today: appState.todayTasks.map(toDashboardTask),
      tomorrow: appState.tomorrowTasks.map(toDashboardTask),
      upcoming: appState.upcomingTasks.map(toDashboardTask),
      completed: appState.closedTasks.map(toDashboardTask),
    };
  }, [appState, toDashboardTask]);

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
    async (task: DashboardTask) => {
      const rawTask = task.raw;
      const nextStatus = !rawTask.isComplete;
      const desiredGroup = (rawTask.target_group ?? "today") as TaskGroup;

      try {
        await updateTask(
          rawTask.id,
          rawTask.content,
          nextStatus,
          rawTask.priority,
          desiredGroup,
          rawTask.date
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
    (task: DashboardTask) => {
      const derivedGroup = (task.raw.target_group ?? "today") as TaskGroup;
      openModal(task.raw, derivedGroup);
    },
    [openModal]
  );

  const completedCount = appState?.completedTasks ?? dashboardData.completed.length;
  const totalCount =
    appState?.totalTasks ??
    dashboardData.completed.length +
      dashboardData.today.length +
      dashboardData.tomorrow.length +
      dashboardData.upcoming.length;

  const tabs: { id: TabId; label: string }[] = [
    { id: "quick", label: "Quick View" },
    { id: "completed", label: "Completed" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <>
      <Head>
        <title>Tasks</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      {showModal ? (
        <Modal
          selectedGroup={targetGroup}
          closeModal={closeModal}
          initialRef={initialRef}
          task={modalTask}
        />
      ) : null}

      <div className="bg-gradient-to-br from-zinc-50 via-white to-zinc-100/80 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-800/30 min-h-screen relative transition-colors duration-300">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.03),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_50%_120%,rgba(14,165,233,0.05),rgba(0,0,0,0))] pointer-events-none" />
        
        <div className="relative z-10">
          {/* Header */}
          <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm box-border content-stretch flex items-center justify-between px-[40px] md:px-[80px] py-[16px] w-full border-b-[0.5px] border-zinc-300 dark:border-zinc-700/50 transition-colors duration-300 shadow-none dark:shadow-sm">
            <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0">
              <div className="relative shrink-0 size-[32px]">
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
              </div>
            </div>

            <button
              onClick={() => setActiveTab("completed")}
              className="content-stretch flex gap-[8px] items-center relative shrink-0 hover:opacity-70 transition-opacity group"
              title="View completed tasks"
            >
              <div className="relative shrink-0 size-[24px]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                  <g>
                    <path
                      d="M15.34 14.12C15.5482 15.0011 15.5544 15.9178 15.358 16.8016C15.1616 17.6854 14.7677 18.5133 14.2059 19.2232C13.6441 19.9332 12.9289 20.5068 12.114 20.9011C11.299 21.2954 10.4053 21.5001 9.5 21.5V16.7M15.34 14.12C17.2499 12.7288 18.8036 10.9055 19.8742 8.79908C20.9447 6.69267 21.5019 4.36287 21.5 2C19.1373 1.9983 16.8077 2.55549 14.7015 3.62607C12.5952 4.69665 10.7721 6.25026 9.381 8.16M15.34 14.12C13.6019 15.3913 11.6103 16.2714 9.5 16.7M9.5 16.7C9.397 16.721 9.293 16.741 9.189 16.76C8.28179 16.0406 7.46038 15.2192 6.741 14.312C6.75989 14.2078 6.77889 14.1038 6.8 14M9.381 8.16C8.49986 7.9516 7.58298 7.94532 6.69907 8.14164C5.81516 8.33797 4.98714 8.73179 4.27707 9.29362C3.567 9.85544 2.9933 10.5707 2.59895 11.3857C2.2046 12.2008 1.99984 13.0946 2 14H6.8M9.381 8.16C8.10988 9.89782 7.22875 11.89 6.8 14M4.561 16.39C3.90318 16.8792 3.39173 17.539 3.08202 18.298C2.77232 19.057 2.67618 19.8863 2.804 20.696C3.61383 20.8237 4.44316 20.7274 5.20218 20.4175C5.96119 20.1077 6.62095 19.596 7.11 18.938M16.25 8.75C16.25 9.14783 16.092 9.52936 15.8107 9.81066C15.5294 10.092 15.1478 10.25 14.75 10.25C14.3522 10.25 13.9706 10.092 13.6893 9.81066C13.408 9.52936 13.25 9.14783 13.25 8.75C13.25 8.35218 13.408 7.97065 13.6893 7.68934C13.9706 7.40804 14.3522 7.25 14.75 7.25C15.1478 7.25 15.5294 7.40804 15.8107 7.68934C16.092 7.97065 16.25 8.35218 16.25 8.75Z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.2"
                      className="text-zinc-900 dark:text-zinc-100"
                    />
                  </g>
                </svg>
              </div>
              <p className="font-['Poppins',_sans-serif] leading-[1.4] not-italic relative shrink-0 text-[16px] text-nowrap text-right text-zinc-900 dark:text-zinc-100 whitespace-pre">
                {completedCount} of {totalCount}{" "}
              </p>
            </button>

            <div className="content-stretch flex gap-[16px] items-center justify-end relative shrink-0">
              <div className="hidden md:block">
                <ThemeSwitch />
              </div>
              <AccountMenu />
            </div>
          </div>

          <div className="px-[40px] md:px-[80px] py-[32px] pb-[120px]">
            {/* Tabs */}
            <div className="mb-12 border-b border-zinc-200/80 dark:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <div className="bg-transparent h-auto p-0 gap-1 flex overflow-x-auto scrollbar-hide">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.id === "quick" ? LayoutGrid : tab.id === "completed" ? CheckCircle2 : BarChart3;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`group relative !bg-transparent data-[state=active]:!border-transparent data-[state=active]:!shadow-none px-5 pb-3.5 pt-3.5 h-auto !border-none rounded-t-lg font-['Poppins',_sans-serif] text-[14px] transition-all duration-300 flex items-center gap-2 whitespace-nowrap after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-gradient-to-r after:from-sky-500 after:via-sky-600 after:to-sky-500 dark:after:from-sky-400 dark:after:via-sky-500 dark:after:to-sky-400 after:transition-all after:duration-300 after:ease-out ${
                          isActive
                            ? "text-sky-600 dark:text-sky-400 after:scale-x-100 after:opacity-100"
                            : "text-zinc-500 dark:text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 hover:after:scale-x-100 hover:after:opacity-40 after:scale-x-0 after:opacity-0"
                        } ${tab.id === "completed" || tab.id === "analytics" ? "hidden md:flex" : ""}`}
                      >
                        <Icon className={`size-[15px] transition-opacity ${
                          isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                        }`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
                
                {activeTab === "quick" && (
                  <button
                    type="button"
                    onClick={() => setShowFilters((prev) => !prev)}
                    className="h-9 gap-2 font-['Poppins',_sans-serif] text-[13px] bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 shadow-none dark:shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 mb-3.5 px-3 py-2 rounded-md flex items-center transition"
                  >
                    <SlidersHorizontal className="size-[14px]" />
                    {showFilters ? "Hide Filters" : "Show Filters"}
                  </button>
                )}
              </div>
            </div>

            {activeTab === "quick" ? (
              <QuickView
                today={dashboardData.today}
                tomorrow={dashboardData.tomorrow}
                upcoming={dashboardData.upcoming}
                onToggleTask={handleToggleTask}
                onEditTask={handleEditTask}
                advancedMode={showFilters}
              />
            ) : null}

            {activeTab === "completed" ? <CompletedPanel tasks={dashboardData.completed} /> : null}

            {activeTab === "analytics" ? (
              <AnalyticsPanel
                today={dashboardData.today}
                tomorrow={dashboardData.tomorrow}
                upcoming={dashboardData.upcoming}
                completed={dashboardData.completed}
              />
            ) : null}
          </div>

          {/* Right-aligned Add Task Button */}
          <button
            onClick={() => openModal(null, "today")}
            className="fixed bottom-[100px] right-[40px] md:right-[80px] px-[24px] py-[14px] bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 rounded-full shadow-md hover:shadow-lg dark:shadow-lg dark:hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-[10px] group z-50"
            title="Add new task (⌘K)"
          >
            <svg className="size-[20px]" fill="none" viewBox="0 0 24 24">
              <path 
                d="M12 5V19" 
                stroke="white" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2.5"
              />
              <path 
                d="M5 12H19" 
                stroke="white" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2.5"
              />
            </svg>
            <span className="font-['Poppins',_sans-serif] text-[14px] text-white">
              Add New Task
            </span>
          </button>

          <div className="fixed bottom-0 left-0 right-0 box-border flex gap-[10px] items-center justify-between px-[40px] md:px-[80px] py-[24px] border-t-[0.5px] border-zinc-300 dark:border-zinc-700/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.2)]">
            <p className="font-['Poppins',_sans-serif] leading-[1.3] not-italic text-[14px] text-nowrap text-zinc-400 tracking-[0.14px] whitespace-pre">
              © 2022 offtasks.com
            </p>
            <p className="hidden md:block font-['Poppins',_sans-serif] leading-[1.3] not-italic text-[12px] text-zinc-400">
              <kbd className="px-[6px] py-[2px] bg-zinc-200 dark:bg-zinc-700 rounded-[4px] text-[11px]">⌘K</kbd> Quick add
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
