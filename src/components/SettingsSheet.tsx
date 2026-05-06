import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./ui/sheet";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Search, LogOut } from "lucide-react";
import type { Task } from "../types/task";

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  tasks?: Task[];
  onToggleTask?: (id: string) => void;
  onLogout?: () => void;
  userEmail?: string;
}

export function SettingsSheet({
  isOpen,
  onClose,
  isDark,
  onToggleTheme,
  tasks = [],
  onToggleTask,
  onLogout,
  userEmail,
}: SettingsSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return tasks.filter((task) =>
      [
        task.text,
        task.label ?? "",
        task.category === "upcoming" ? "later" : task.category,
        task.raw?.date ?? "",
        task.completed ? "closed complete done" : "open active pending",
      ].some((part) => part.toLowerCase().includes(query)),
    );
  }, [searchQuery, tasks]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Manage your preferences and app configuration
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Account Section */}
          <div className="space-y-4">
            <h3 className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
              Account
            </h3>
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-3">
              <div>
                <p className="font-['Poppins',_sans-serif] text-[12px] text-zinc-500 dark:text-zinc-400">
                  Email
                </p>
                <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-900 dark:text-zinc-100 break-all">
                  {userEmail ?? "Unknown user"}
                </p>
              </div>
              <div>
                <p className="font-['Poppins',_sans-serif] text-[12px] text-zinc-500 dark:text-zinc-400">
                  Sync status
                </p>
                <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-900 dark:text-zinc-100">
                  Connected to Supabase
                </p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-white font-['Poppins',_sans-serif] text-[14px] hover:bg-sky-700 transition-colors"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              )}
            </div>
          </div>

          <Separator />

          {/* Search Section */}
          <div className="space-y-4">
            <h3 className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
              Search all tasks
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search all tasks"
                className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-9 pr-3 font-['Poppins',_sans-serif] text-[14px] text-zinc-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            {searchQuery.trim() && (
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {filteredTasks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-center font-['Poppins',_sans-serif] text-[13px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    No matching tasks
                  </p>
                ) : (
                  filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50"
                    >
                      <button
                        onClick={() => onToggleTask?.(task.id)}
                        className={`mt-0.5 size-5 rounded border transition-colors ${
                          task.completed
                            ? "border-sky-600 bg-sky-600"
                            : "border-zinc-400 bg-transparent"
                        }`}
                        aria-label={
                          task.completed ? "Reopen task" : "Complete task"
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`font-['Poppins',_sans-serif] text-[14px] ${task.completed ? "line-through text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`}
                        >
                          {task.text}
                        </p>
                        <p className="mt-1 font-['Poppins',_sans-serif] text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                          {task.category === "upcoming"
                            ? "Later"
                            : task.category}
                          {task.label ? ` • ${task.label}` : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Appearance Section */}
          <div className="space-y-4">
            <h3 className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
              Appearance
            </h3>

            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
              <div className="space-y-0.5">
                <Label
                  htmlFor="dark-mode"
                  className="font-['Poppins',_sans-serif] text-[14px]"
                >
                  Dark Mode
                </Label>
                <p className="font-['Poppins',_sans-serif] text-[12px] text-zinc-500 dark:text-zinc-400">
                  Toggle dark theme on or off
                </p>
              </div>
              <Switch
                id="dark-mode"
                checked={isDark}
                onCheckedChange={onToggleTheme}
              />
            </div>
          </div>

          <Separator />

          {/* Keyboard Shortcuts Section */}
          <div className="space-y-4">
            <h3 className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
              Keyboard Shortcuts
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-700 dark:text-zinc-300">
                  Quick add task
                </p>
                <kbd className="px-[8px] py-[4px] bg-zinc-200 dark:bg-zinc-700 rounded-[4px] text-[12px] font-['Poppins',_sans-serif]">
                  ⌘+
                </kbd>
              </div>
            </div>
          </div>

          <Separator />

          {/* About Section */}
          <div className="space-y-4">
            <h3 className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
              About
            </h3>

            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2">
              <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-900 dark:text-zinc-100">
                offtasks
              </p>
              <p className="font-['Poppins',_sans-serif] text-[12px] text-zinc-500 dark:text-zinc-400">
                A simple and elegant task management app
              </p>
              <p className="font-['Poppins',_sans-serif] text-[12px] text-zinc-500 dark:text-zinc-400">
                Version 1.0.5.1
              </p>
            </div>
          </div>

          <Separator />

          {/* Data Section */}
          <div className="space-y-4">
            <h3 className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
              Data
            </h3>

            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <p className="font-['Poppins',_sans-serif] text-[12px] text-amber-700 dark:text-amber-400">
                💾 Tasks and preferences sync through Supabase for the signed-in
                account, matching the mobile app.
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
