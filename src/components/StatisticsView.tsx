import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Search,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import {
  getCategoryConfig,
  getDefaultCategoryColor,
} from "@/utils/categoryConfig";
import type { Task } from "@/types/task";

interface StatisticsViewProps {
  tasks: Task[];
  onOpenSearch?: () => void;
}

const sectionLabels: Record<Task["category"], string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  upcoming: "Later",
  close: "Close",
};

const formatCompletedDate = (timestamp?: number) => {
  if (!timestamp) {
    return "Recently";
  }

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getPriorityAccent = (priority?: Task["priority"]) => {
  switch (priority) {
    case "high":
      return "bg-red-500/12 text-red-700 dark:text-red-300 border-red-300/70 dark:border-red-700/60";
    case "medium":
      return "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-300/70 dark:border-amber-700/60";
    case "low":
      return "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-300/70 dark:border-sky-700/60";
    default:
      return "bg-zinc-500/8 text-zinc-600 dark:text-zinc-300 border-zinc-300/70 dark:border-zinc-700/60";
  }
};

export function StatisticsView({ tasks, onOpenSearch }: StatisticsViewProps) {
  const completedTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.completed)
        .sort(
          (left, right) => (right.completedAt ?? 0) - (left.completedAt ?? 0),
        ),
    [tasks],
  );

  const openTasks = useMemo(
    () =>
      tasks
        .filter((task) => !task.completed)
        .sort((left, right) => {
          if (left.overdue !== right.overdue) {
            return Number(right.overdue) - Number(left.overdue);
          }

          const priorityOrder = { high: 3, medium: 2, low: 1 } as const;
          return (
            (priorityOrder[right.priority ?? "low"] ?? 0) -
            (priorityOrder[left.priority ?? "low"] ?? 0)
          );
        }),
    [tasks],
  );

  const completedToday = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).getTime();
    return completedTasks.filter(
      (task) => (task.completedAt ?? 0) >= todayStart,
    ).length;
  }, [completedTasks]);

  const completionRate = tasks.length
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  const groupedOpenIssues = useMemo(
    () => [
      {
        label: "Today",
        count: openTasks.filter((task) => task.category === "today").length,
      },
      {
        label: "Tomorrow",
        count: openTasks.filter((task) => task.category === "tomorrow").length,
      },
      {
        label: "Later",
        count: openTasks.filter((task) => task.category === "upcoming").length,
      },
    ],
    [openTasks],
  );

  const recentWins = completedTasks.slice(0, 3);
  const spotlightOpenIssues = openTasks.slice(0, 6);

  if (tasks.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-8">
          <h2 className="font-['Poppins',_sans-serif] text-[28px] text-zinc-900 dark:text-zinc-100 mb-2">
            Statistics
          </h2>
          <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-500 dark:text-zinc-400">
            Wins, open issues, and recent momentum will gather here.
          </p>
        </div>

        <EmptyState
          icon={Sparkles}
          title="No statistics yet"
          description="Add and complete tasks to unlock wins, open issues, and progress snapshots in one place."
          className="min-h-[360px]"
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      <style>{`
        @keyframes statistics-burst {
          0% { transform: translate3d(0, 18px, 0) scale(0.3); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate3d(var(--tx), var(--ty), 0) scale(1); opacity: 0; }
        }
      `}</style>

      <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 dark:border-emerald-900/40 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(240,249,255,0.92),rgba(255,251,235,0.94))] dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.36),rgba(3,105,161,0.22),rgba(113,63,18,0.2))] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[
            ["16%", "18%", "-28px", "-88px", "bg-amber-300/80"],
            ["28%", "26%", "32px", "-104px", "bg-emerald-300/80"],
            ["44%", "20%", "-8px", "-120px", "bg-sky-300/80"],
            ["62%", "24%", "44px", "-86px", "bg-rose-300/80"],
            ["78%", "18%", "-34px", "-110px", "bg-violet-300/80"],
            ["88%", "26%", "18px", "-96px", "bg-cyan-300/80"],
          ].map(([left, top, tx, ty, color], index) => (
            <span
              key={`${left}-${top}-${index}`}
              className={`absolute size-3 rounded-full ${color}`}
              style={{
                left,
                top,
                ["--tx" as string]: tx,
                ["--ty" as string]: ty,
                animation: `statistics-burst ${1.8 + index * 0.12}s ease-out infinite`,
                animationDelay: `${index * 0.18}s`,
              }}
            />
          ))}
        </div>

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[720px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <Sparkles className="size-4 text-emerald-600 dark:text-emerald-300" />
              <span className="font-['Poppins',_sans-serif] text-[12px] uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-200">
                Statistics
              </span>
            </div>

            <h2 className="mt-5 font-['Poppins',_sans-serif] text-[34px] leading-[1.1] text-zinc-950 dark:text-zinc-50">
              One place for wins, open issues, and everything still moving.
            </h2>

            <p className="mt-3 max-w-[640px] font-['Poppins',_sans-serif] text-[15px] leading-[1.7] text-zinc-600 dark:text-zinc-300">
              Fireworks for what just landed, recent wins for context, and open
              versus closed issues side by side so this feature does not need a
              separate analytics or completed screen anymore.
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={onOpenSearch}
            className="h-12 rounded-full border border-white/70 bg-white/80 px-5 text-zinc-900 shadow-sm hover:bg-white dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            <Search className="mr-2 size-4" />
            Search Tasks
          </Button>
        </div>

        <div className="relative mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[20px] border border-white/70 bg-white/80 p-5 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/40">
            <p className="font-['Poppins',_sans-serif] text-[12px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              Closed Issues
            </p>
            <p className="mt-3 font-['Poppins',_sans-serif] text-[32px] text-zinc-950 dark:text-zinc-50">
              {completedTasks.length}
            </p>
            <p className="mt-1 font-['Poppins',_sans-serif] text-[13px] text-zinc-600 dark:text-zinc-300">
              Finished tasks collected into one feed.
            </p>
          </div>

          <div className="rounded-[20px] border border-white/70 bg-white/80 p-5 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/40">
            <p className="font-['Poppins',_sans-serif] text-[12px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              Open Issues
            </p>
            <p className="mt-3 font-['Poppins',_sans-serif] text-[32px] text-zinc-950 dark:text-zinc-50">
              {openTasks.length}
            </p>
            <p className="mt-1 font-['Poppins',_sans-serif] text-[13px] text-zinc-600 dark:text-zinc-300">
              {openTasks.filter((task) => task.overdue).length} overdue and
              worth attention.
            </p>
          </div>

          <div className="rounded-[20px] border border-white/70 bg-white/80 p-5 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/40">
            <p className="font-['Poppins',_sans-serif] text-[12px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              Wins Today
            </p>
            <p className="mt-3 font-['Poppins',_sans-serif] text-[32px] text-zinc-950 dark:text-zinc-50">
              {completedToday}
            </p>
            <p className="mt-1 font-['Poppins',_sans-serif] text-[13px] text-zinc-600 dark:text-zinc-300">
              Fresh progress from the current day.
            </p>
          </div>

          <div className="rounded-[20px] border border-white/70 bg-white/80 p-5 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/40">
            <p className="font-['Poppins',_sans-serif] text-[12px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              Completion Rate
            </p>
            <p className="mt-3 font-['Poppins',_sans-serif] text-[32px] text-zinc-950 dark:text-zinc-50">
              {completionRate}%
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-amber-500 transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[24px] border border-zinc-200/80 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-['Poppins',_sans-serif] text-[22px] text-zinc-950 dark:text-zinc-50">
                Recent Wins
              </h3>
              <p className="mt-2 font-['Poppins',_sans-serif] text-[14px] text-zinc-500 dark:text-zinc-400">
                The latest completed tasks, surfaced before the deeper issue
                lists.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {recentWins.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
                <p className="font-['Poppins',_sans-serif] text-[15px] text-zinc-600 dark:text-zinc-300">
                  Close a few tasks and your recent wins will start stacking
                  here.
                </p>
              </div>
            ) : (
              recentWins.map((task, index) => {
                const config = task.label
                  ? (getCategoryConfig(task.label) ?? getDefaultCategoryColor())
                  : null;

                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-4 rounded-[20px] border border-emerald-200/70 bg-emerald-50/70 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-emerald-700 shadow-sm dark:bg-zinc-900 dark:text-emerald-300">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-['Poppins',_sans-serif] text-[15px] text-zinc-900 dark:text-zinc-100">
                          {task.text}
                        </p>
                        {config ? (
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 font-['Poppins',_sans-serif] text-[11px] ${config.bgColor} ${config.borderColor} ${config.color}`}
                          >
                            {task.label}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 font-['Poppins',_sans-serif] text-[13px] text-zinc-500 dark:text-zinc-400">
                        Closed in {sectionLabels[task.category]} on{" "}
                        {formatCompletedDate(task.completedAt)}
                      </p>
                    </div>
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-zinc-200/80 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <h3 className="font-['Poppins',_sans-serif] text-[22px] text-zinc-950 dark:text-zinc-50">
            Open Issues
          </h3>
          <p className="mt-2 font-['Poppins',_sans-serif] text-[14px] text-zinc-500 dark:text-zinc-400">
            What remains active, grouped and prioritized from the same screen.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {groupedOpenIssues.map((group) => (
              <div
                key={group.label}
                className="rounded-[18px] border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
              >
                <p className="font-['Poppins',_sans-serif] text-[12px] uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                  {group.label}
                </p>
                <p className="mt-2 font-['Poppins',_sans-serif] text-[28px] text-zinc-900 dark:text-zinc-100">
                  {group.count}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {spotlightOpenIssues.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-zinc-300 p-5 text-center dark:border-zinc-700">
                <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-300">
                  No open issues right now.
                </p>
              </div>
            ) : (
              spotlightOpenIssues.map((task) => (
                <div
                  key={task.id}
                  className="rounded-[18px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-['Poppins',_sans-serif] text-[15px] text-zinc-900 dark:text-zinc-100">
                        {task.text}
                      </p>
                      <p className="mt-2 font-['Poppins',_sans-serif] text-[12px] uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                        {sectionLabels[task.category]}
                      </p>
                    </div>
                    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-zinc-400" />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.overdue ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-300/70 bg-red-500/10 px-2.5 py-1 font-['Poppins',_sans-serif] text-[11px] text-red-700 dark:border-red-700/60 dark:text-red-300">
                        <AlertTriangle className="size-3" />
                        Overdue
                      </span>
                    ) : null}

                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-['Poppins',_sans-serif] text-[11px] ${getPriorityAccent(task.priority)}`}
                    >
                      {task.priority
                        ? `${task.priority} priority`
                        : "No priority"}
                    </span>

                    {task.label ? (
                      <span className="inline-flex items-center rounded-full border border-zinc-300/80 bg-zinc-100 px-2.5 py-1 font-['Poppins',_sans-serif] text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        {task.label}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[24px] border border-zinc-200/80 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-['Poppins',_sans-serif] text-[22px] text-zinc-950 dark:text-zinc-50">
              Closed Issues
            </h3>
            <p className="mt-2 font-['Poppins',_sans-serif] text-[14px] text-zinc-500 dark:text-zinc-400">
              Full completed task feed without a separate completed screen.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/50">
            <Clock3 className="size-4 text-zinc-500 dark:text-zinc-400" />
            <span className="font-['Poppins',_sans-serif] text-[12px] text-zinc-600 dark:text-zinc-300">
              {completedTasks.length} archived wins
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {completedTasks.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
              <p className="font-['Poppins',_sans-serif] text-[15px] text-zinc-600 dark:text-zinc-300">
                Completed tasks will show up here once you start closing them
                out.
              </p>
            </div>
          ) : (
            completedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-4 rounded-[18px] border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
              >
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                  <CheckCircle2 className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <p className="font-['Poppins',_sans-serif] text-[15px] text-zinc-500 line-through dark:text-zinc-400">
                      {task.text}
                    </p>
                    <p className="font-['Poppins',_sans-serif] text-[12px] text-zinc-400 dark:text-zinc-500">
                      {formatCompletedDate(task.completedAt)}
                    </p>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-zinc-300/80 bg-white px-2.5 py-1 font-['Poppins',_sans-serif] text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                      {sectionLabels[task.category]}
                    </span>

                    {task.priority ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 font-['Poppins',_sans-serif] text-[11px] ${getPriorityAccent(task.priority)}`}
                      >
                        {task.priority} priority
                      </span>
                    ) : null}

                    {task.label ? (
                      <span className="inline-flex items-center rounded-full border border-zinc-300/80 bg-zinc-100 px-2.5 py-1 font-['Poppins',_sans-serif] text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        {task.label}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
