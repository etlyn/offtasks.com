import {
  CalendarRange,
  CheckCircle2,
  Clock3,
  Plus,
  Target,
} from "lucide-react";
import { cn } from "@/components/ui/utils";

interface TaskBoardPreviewProps {
  compact?: boolean;
}

const boardColumns = [
  {
    title: "Today",
    accent: "bg-[#134E4A]",
    footer: "3 tasks in motion",
    items: [
      {
        title: "Review weekly budget",
        meta: "Personal",
        tone: "bg-[#dcfce7] text-[#166534]",
      },
      {
        title: "Draft client reply",
        meta: "Work",
        tone: "bg-[#cffafe] text-[#0f766e]",
      },
      {
        title: "Order dog food",
        meta: "Home",
        tone: "bg-[#fef3c7] text-[#92400e]",
      },
    ],
  },
  {
    title: "Tomorrow",
    accent: "bg-[#0F766E]",
    footer: "Keep tomorrow light",
    items: [
      {
        title: "Gym before 8am",
        meta: "Health",
        tone: "bg-[#e0f2fe] text-[#0369a1]",
      },
      {
        title: "Follow up on invoice",
        meta: "Finance",
        tone: "bg-[#ede9fe] text-[#6d28d9]",
      },
    ],
  },
  {
    title: "Later",
    accent: "bg-[#0EA5E9]",
    footer: "Ideas parked safely",
    items: [
      {
        title: "Plan weekend trip",
        meta: "Personal",
        tone: "bg-[#fee2e2] text-[#b91c1c]",
      },
      {
        title: "Refresh kitchen staples",
        meta: "Shopping",
        tone: "bg-[#fef3c7] text-[#a16207]",
      },
    ],
  },
];

const insightCards = [
  {
    icon: Target,
    label: "Daily focus",
    value: "82%",
    caption: "Most lists close with 4 to 6 finished tasks.",
  },
  {
    icon: Clock3,
    label: "Quick capture",
    value: "<10 sec",
    caption: "Add a task before it slips away.",
  },
  {
    icon: CalendarRange,
    label: "Clear rhythm",
    value: "3 views",
    caption: "Today, tomorrow, and later stay easy to scan.",
  },
];

export const TaskBoardPreview = ({
  compact = false,
}: TaskBoardPreviewProps) => (
  <div className="relative overflow-hidden rounded-[30px] border border-[#0f3f3b]/10 bg-[#0d2b27] p-4 text-white shadow-[0_48px_120px_-48px_rgba(7,32,29,0.85)]">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(153,246,228,0.18),transparent_34%),linear-gradient(160deg,rgba(255,255,255,0.08),rgba(255,255,255,0))]" />

    <div className="relative space-y-4">
      <div
        className={cn(
          "grid gap-4",
          compact
            ? "grid-cols-1"
            : "xl:grid-cols-[1.5fr_0.85fr] xl:items-start",
        )}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {boardColumns.map((column) => (
            <div
              key={column.title}
              className="rounded-[24px] border border-white/10 bg-[#133430] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <div className="rounded-[20px] bg-[#f7fcfa] p-4 text-[#123532]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("size-2.5 rounded-full", column.accent)}
                    />
                    <p className="text-sm font-semibold text-[#123532]">
                      {column.title}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex size-8 items-center justify-center rounded-full border border-[#d9ece6] bg-white text-[#134E4A] shadow-[0_10px_20px_-16px_rgba(9,48,43,0.45)]"
                    aria-label={`Add task to ${column.title}`}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {column.items.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-[#e1efea] bg-white px-3 py-3 shadow-[0_12px_24px_-22px_rgba(9,48,43,0.35)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 size-4 text-[#0f766e]" />
                          <div>
                            <p className="text-sm font-semibold text-[#123532]">
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs text-[#68857f]">
                              {item.meta}
                            </p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                            item.tone,
                          )}
                        >
                          Ready
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-[#6a8681]">
                  {column.footer}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {insightCards.map(({ icon: Icon, label, value, caption }) => (
            <div
              key={label}
              className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-xl"
            >
              <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-[#99F6E4]/14 text-[#99F6E4]">
                <Icon className="size-5" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#a8d8ce]">
                {label}
              </p>
              <p className="mt-2 font-['Sora',_sans-serif] text-3xl font-semibold tracking-[-0.04em] text-white">
                {value}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#c6ddd8]">{caption}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
