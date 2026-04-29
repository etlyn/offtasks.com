import {
  BarChart3,
  CalendarDays,
  Check,
  Flag,
  Menu,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
} from "lucide-react";
import { cn } from "@/components/ui/utils";

const previewTasks = [
  {
    title: "Review design feedback",
    meta: "Work · High priority",
    checked: false,
    accent: "bg-[#ff6467]",
    priority: true,
  },
  {
    title: "Book dentist appointment",
    meta: "Health · Tomorrow",
    checked: true,
    accent: "bg-[#009689]",
    priority: false,
  },
  {
    title: "Pick up groceries",
    meta: "Home · Later",
    checked: false,
    accent: "bg-[#38bdf8]",
    priority: false,
  },
];

const tabItems = [
  { label: "Today", icon: Check, active: true },
  { label: "Tomorrow", icon: CalendarDays, active: false },
  { label: "Later", icon: Sparkles, active: false },
];

const filterPills = ["Work", "Home", "Priority", "Hidden done"];

const floatingCards = [
  {
    icon: Flag,
    label: "Priority",
    value: "Focus first",
    className: "-left-5 top-28 hidden sm:block",
  },
  {
    icon: Tag,
    label: "Labels",
    value: "Work · Home",
    className: "-right-4 top-56 hidden md:block",
  },
  {
    icon: BarChart3,
    label: "Stats",
    value: "4 done today",
    className: "bottom-16 left-5 hidden sm:block",
  },
];

export const LandingIllustration = () => (
  <div className="relative mx-auto w-full max-w-[640px] animate-[rise-in_900ms_ease-out_both] lg:ml-auto">
    <div className="absolute left-1/2 top-16 h-72 w-[78%] -translate-x-1/2 rounded-full bg-[#99f6e4]/60 blur-[120px]" />
    <div className="absolute right-4 top-10 h-44 w-44 rounded-full bg-[#38bdf8]/24 blur-[82px]" />
    <div className="absolute bottom-6 left-8 h-36 w-36 rounded-full bg-[#009689]/30 blur-[80px]" />

    <div className="relative mx-auto max-w-[390px] rounded-[46px] border border-white/75 bg-white/45 p-3 shadow-[0_54px_140px_-58px_rgba(15,23,42,0.55)] backdrop-blur-2xl sm:max-w-[420px]">
      <div className="absolute inset-0 rounded-[46px] bg-[linear-gradient(135deg,rgba(255,255,255,0.68),rgba(255,255,255,0.16))]" />

      <div className="relative min-h-[640px] overflow-hidden rounded-[38px] border border-[#273244] bg-[#09090b] p-4 pb-[116px] text-[#f4f4f5] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_34px_80px_-46px_rgba(2,6,23,0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,150,137,0.34),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.14),transparent_28%)]" />
        <div className="absolute inset-x-8 top-0 h-px bg-white/20" />

        <div className="relative">
          <div className="mx-auto mb-4 h-1.5 w-20 rounded-full bg-white/12" />

          <div className="rounded-2xl border border-[#273244] bg-[#0f172a]/82 p-2 shadow-[0_12px_32px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <button
                className="flex size-9 items-center justify-center rounded-[14px] border border-[#273244] bg-[#111827] text-[#f4f4f5]"
                aria-label="Open menu"
                type="button"
              >
                <Menu className="size-4" />
              </button>
              <div className="text-center">
                <p className="text-sm font-medium text-[#f4f4f5]">
                  2 <span className="text-[#94a3b8]">/ 5 done</span>
                </p>
                <p className="text-[11px] font-medium text-[#94a3b8]">
                  Today feels manageable
                </p>
              </div>
              <button
                className="flex size-9 items-center justify-center rounded-[14px] border border-[#273244] bg-[#111827] text-[#f4f4f5]"
                aria-label="Search tasks"
                type="button"
              >
                <Search className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#99f6e4]">
                Offtasks
              </p>
              <h3 className="mt-2 font-['Sora',_sans-serif] text-3xl font-semibold tracking-[-0.055em] text-white">
                Today
              </h3>
            </div>
            <div className="rounded-full border border-[#273244] bg-[#111827]/88 px-3 py-1.5 text-xs font-semibold text-[#cbd5e1] backdrop-blur-xl">
              Apr 28
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {previewTasks.map((task) => (
              <div
                key={task.title}
                className={cn(
                  "rounded-[22px] border p-4 shadow-[0_16px_34px_-28px_rgba(0,0,0,0.9)]",
                  task.priority
                    ? "border-[#ff6467]/30 bg-[#ff6467]/12"
                    : "border-[#273244] bg-[#111827]/72",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-lg border",
                      task.checked
                        ? "border-[#009689] bg-[#009689] text-white"
                        : task.priority
                          ? "border-[#ff6467]/45 bg-[#ff6467]/12 text-transparent"
                          : "border-[#334155] bg-[#0f172a] text-transparent",
                    )}
                  >
                    <Check className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-semibold text-[#f4f4f5]",
                        task.priority && "text-[#ff8587]",
                        task.checked && "text-[#94a3b8] line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs font-medium text-[#94a3b8]">
                      {task.meta}
                    </p>
                  </div>
                  <span className={cn("size-2.5 rounded-full", task.accent)} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[24px] border border-[#273244] bg-[#0f172a]/86 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#cbd5e1]">
                <SlidersHorizontal className="size-4 text-[#99f6e4]" />
                Advanced mode
              </div>
              <div className="rounded-full bg-[#009689]/20 px-3 py-1 text-xs font-semibold text-[#99f6e4]">
                On
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 pr-20">
            {filterPills.map((pill, index) => (
              <span
                key={pill}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold",
                  index === 0
                    ? "border-[#009689]/40 bg-[#009689]/20 text-[#99f6e4]"
                    : "border-[#273244] bg-[#111827]/72 text-[#cbd5e1]",
                )}
              >
                {pill}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          aria-label="Add task"
          className="absolute bottom-[96px] right-5 flex size-14 items-center justify-center rounded-full bg-[#009689] text-white shadow-[0_24px_54px_-22px_rgba(0,150,137,0.78)]"
        >
          <Plus className="size-7" strokeWidth={2.1} />
        </button>

        <div className="absolute inset-x-4 bottom-4 rounded-[24px] border border-[#273244] bg-[#0f172a]/94 p-2 backdrop-blur-xl">
          <div className="grid grid-cols-3 gap-2">
            {tabItems.map(({ label, icon: Icon, active }) => (
              <div
                key={label}
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl border py-3 text-xs font-medium",
                  active
                    ? "border-[#009689]/38 bg-[#009689]/24 text-[#99f6e4]"
                    : "border-transparent text-[#94a3b8]",
                )}
              >
                <Icon className="mb-1.5 size-4" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {floatingCards.map(({ icon: Icon, label, value, className }) => (
      <div
        key={label}
        className={cn(
          "absolute rounded-[24px] border border-white/70 bg-white/75 p-4 shadow-[0_28px_60px_-42px_rgba(15,23,42,0.34)] backdrop-blur-2xl",
          className,
        )}
      >
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[#09090b] text-[#99f6e4]">
          <Icon className="size-4" />
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#64748b]">
          {label}
        </p>
        <p className="mt-1 font-['Sora',_sans-serif] text-base font-semibold tracking-[-0.035em] text-[#0f172a]">
          {value}
        </p>
      </div>
    ))}
  </div>
);
