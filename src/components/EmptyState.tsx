import type { LucideIcon } from "lucide-react";
import { cn } from "./ui/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  iconClassName?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconClassName,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-zinc-300/80 bg-white/50 px-6 py-12 text-center dark:border-zinc-700/70 dark:bg-zinc-900/30",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
        <Icon className={cn("size-7", iconClassName)} strokeWidth={1.8} />
      </div>
      <div className="space-y-1.5">
        <p className="font-['Poppins',_sans-serif] text-[15px] font-medium text-zinc-700 dark:text-zinc-300">
          {title}
        </p>
        {description ? (
          <p className="mx-auto max-w-[320px] font-['Poppins',_sans-serif] text-[13px] leading-5 text-zinc-500 dark:text-zinc-500">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}