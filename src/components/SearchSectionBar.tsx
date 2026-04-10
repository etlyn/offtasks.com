import { Search, X } from "lucide-react";

import { cn } from "./ui/utils";

interface SearchSectionBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
}

export function SearchSectionBar({
  value,
  onChange,
  onClear,
  placeholder = "Search tasks...",
  className,
}: SearchSectionBarProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-[20px] bg-[#d3d6dd] p-[10px] sm:w-[377px] dark:bg-zinc-800/80",
        className,
      )}
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#9f9fa9] dark:text-zinc-500" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full rounded-full border border-[rgba(228,228,231,0.8)] bg-white pl-10 pr-4 font-['Poppins',_sans-serif] text-[14px] text-zinc-900 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] outline-none transition focus:border-zinc-300 focus:ring-2 focus:ring-white/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-600 dark:focus:ring-zinc-700/60"
        />
      </div>

      <button
        type="button"
        onClick={onClear}
        aria-label={value ? "Clear search" : "Reset search"}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[rgba(228,228,231,0.8)] bg-white text-[#7d7d87] shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-white/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:focus:ring-zinc-700/60"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}