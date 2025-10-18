import React from "react";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { AccountMenu } from "@/components/AccountMenu";

interface DashboardHeaderProps {
  completedCount: number;
  totalCount: number;
}

export const DashboardHeader = ({ completedCount, totalCount }: DashboardHeaderProps) => {
  const completionCopy = `${completedCount} of ${totalCount}`;

  return (
    <header className="glass-surface sticky top-0 z-40 mx-auto mt-6 w-[min(1200px,95%)] rounded-3xl px-6 py-4 shadow-soft-md backdrop-blur-2xl transition-colors duration-300 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-400 to-teal-400 text-lg font-semibold text-white shadow-[0_14px_30px_rgba(14,165,233,0.35)]">
            O
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-500/80 dark:text-sky-300/80">
              Dashboard
            </p>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Offtasks Control Center
            </h1>
          </div>
        </div>

        <div className="flex flex-col items-start rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-left shadow-[0_8px_24px_rgba(14,165,233,0.12)] transition dark:border-zinc-700/60 dark:bg-zinc-900/60 dark:text-zinc-200">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Progress
          </span>
          <span className="text-lg font-semibold text-sky-600 dark:text-sky-400">
            {completionCopy}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3">
          <ThemeSwitch />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
};
