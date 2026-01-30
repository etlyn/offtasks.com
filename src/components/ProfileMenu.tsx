import * as React from "react";
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Cpu,
  EyeOff,
  LogOut,
  Moon,
  Search,
  Sun,
  User,
  X,
} from "lucide-react";

import { Sheet, SheetClose, SheetContent, SheetTrigger } from "./ui/sheet";
import { Switch } from "./ui/switch";

interface ProfileMenuProps {
  onLogout: () => void;
  totalCompleted?: number;
  totalTasks?: number;
  onOpenSearch?: () => void;
  onViewQuickView?: () => void;
  onViewCompleted?: () => void;
  onViewAnalytics?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  advancedMode?: boolean;
  hideCompleted?: boolean;
  onToggleAdvancedMode?: () => void;
  onToggleHideCompleted?: (value: boolean) => void;
  userEmail?: string;
  userName?: string;
}

const getInitials = (email?: string, name?: string) => {
  if (name && name.trim().length) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  if (email) {
    const handle = email.split("@")[0];
    if (handle.includes(".")) {
      const segments = handle.split(".");
      if (segments.length >= 2) {
        return `${segments[0][0]}${segments[1][0]}`.toUpperCase();
      }
    }
    return handle.slice(0, 2).toUpperCase();
  }

  return "JD";
};

export function ProfileMenu({
  onLogout,
  totalCompleted = 0,
  totalTasks = 0,
  onOpenSearch,
  onViewQuickView,
  onViewCompleted,
  onViewAnalytics,
  isDark,
  onToggleTheme,
  advancedMode,
  hideCompleted,
  onToggleAdvancedMode,
  onToggleHideCompleted,
  userEmail,
  userName,
}: ProfileMenuProps) {
  const initials = getInitials(userEmail, userName);
  const [open, setOpen] = React.useState(false);
  const themeLabel = isDark ? "Dark" : "Light";
  const completionLabel = totalTasks > 0 ? `${totalCompleted}/${totalTasks} completed` : "No tasks yet";
  const displayName = userName ?? "User";

  const closeAndRun = (action?: () => void) => () => {
    if (action) {
      action();
    }
    setOpen(false);
  };

  const handleSearch = () => {
    if (onOpenSearch) {
      onOpenSearch();
    } else if (onViewQuickView) {
      onViewQuickView();
    }
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="relative shrink-0 size-[44px] rounded-full bg-zinc-700 dark:bg-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-600 border-2 border-zinc-300 dark:border-zinc-600/40 transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95 shadow-sm hover:shadow-md dark:shadow-md dark:hover:shadow-lg"
          title="Profile menu"
        >
          <span className="font-['Poppins',_sans-serif] text-[16px] text-white select-none">
            {initials}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[420px] p-0 bg-white text-zinc-900 border-zinc-200"
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-zinc-200 px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-gradient-to-b from-teal-900 to-teal-800 shadow-[0px_10px_15px_rgba(0,0,0,0.1)] flex items-center justify-center">
                  <User className="size-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-['Poppins',_sans-serif] text-[16px] text-zinc-900">
                    {displayName}
                  </span>
                  <span className="font-['Poppins',_sans-serif] text-[12px] text-zinc-500">
                    {completionLabel}
                  </span>
                </div>
              </div>

              <SheetClose asChild>
                <button
                  className="size-10 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </SheetClose>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-[0px_8px_32px_rgba(0,0,0,0.08)]">
              <button
                onClick={handleSearch}
                className="w-full flex items-center gap-3 px-4 py-4 border-b border-zinc-100 text-left hover:bg-zinc-50 transition"
              >
                <div className="size-9 rounded-full border border-[#bedbff] bg-[#dbeafe] flex items-center justify-center">
                  <Search className="size-4 text-sky-600" />
                </div>
                <span className="flex-1 font-['Poppins',_sans-serif] text-[15px] text-zinc-900">
                  Search
                </span>
                <ChevronRight className="size-4 text-zinc-400" />
              </button>

              <button
                onClick={closeAndRun(onViewAnalytics)}
                className="w-full flex items-center gap-3 px-4 py-4 border-b border-zinc-100 text-left hover:bg-zinc-50 transition"
              >
                <div className="size-9 rounded-full border border-[#e9d4ff] bg-[#f3e8ff] flex items-center justify-center">
                  <BarChart3 className="size-4 text-purple-600" />
                </div>
                <span className="flex-1 font-['Poppins',_sans-serif] text-[15px] text-zinc-900">
                  Analytics
                </span>
                <ChevronRight className="size-4 text-zinc-400" />
              </button>

              <button
                onClick={closeAndRun(onViewCompleted)}
                className="w-full flex items-center gap-3 px-4 py-4 border-b border-zinc-100 text-left hover:bg-zinc-50 transition"
              >
                <div className="size-9 rounded-full border border-[#b9f8cf] bg-[#dcfce7] flex items-center justify-center">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                </div>
                <span className="flex-1 font-['Poppins',_sans-serif] text-[15px] text-zinc-900">
                  Completed Tasks
                </span>
                <ChevronRight className="size-4 text-zinc-400" />
              </button>

              <button
                onClick={closeAndRun(onToggleTheme)}
                className="w-full flex items-center gap-3 px-4 py-4 border-b border-zinc-100 text-left hover:bg-zinc-50 transition"
              >
                <div className="size-9 rounded-full border border-[#fee685] bg-[#fef3c6] flex items-center justify-center">
                  {isDark ? (
                    <Moon className="size-4 text-amber-600" />
                  ) : (
                    <Sun className="size-4 text-amber-600" />
                  )}
                </div>
                <span className="flex-1 font-['Poppins',_sans-serif] text-[15px] text-zinc-900">
                  Theme
                </span>
                <span className="font-['Poppins',_sans-serif] text-[13px] text-zinc-500">
                  {themeLabel}
                </span>
              </button>

              <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-100">
                <div className="size-9 rounded-full border border-[#b8e6fe] bg-[#dff2fe] flex items-center justify-center">
                  <EyeOff className="size-4 text-sky-600" />
                </div>
                <span className="flex-1 font-['Poppins',_sans-serif] text-[15px] text-zinc-900">
                  Hide Completed Tasks
                </span>
                <Switch
                  checked={!!hideCompleted}
                  onCheckedChange={(value) => onToggleHideCompleted?.(value)}
                />
              </div>

              <div className="flex items-center gap-3 px-4 py-4">
                <div className="size-9 rounded-full border border-[#96f7e4] bg-[#cbfbf1] flex items-center justify-center">
                  <Cpu className="size-4 text-teal-600" />
                </div>
                <span className="flex-1 font-['Poppins',_sans-serif] text-[15px] text-zinc-900">
                  Advanced Mode
                </span>
                <Switch
                  checked={!!advancedMode}
                  onCheckedChange={() => onToggleAdvancedMode?.()}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 px-5 py-6">
            <button
              onClick={closeAndRun(onLogout)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-[0px_1px_3px_rgba(0,0,0,0.1)] transition hover:bg-red-100"
            >
              <LogOut className="size-4 text-red-600" />
              <span className="font-['Poppins',_sans-serif] text-[15px] text-red-600">Log Out</span>
            </button>
            <p className="mt-4 text-center font-['Poppins',_sans-serif] text-[11px] text-zinc-400">
              offtasks mobile v1.0.0
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
