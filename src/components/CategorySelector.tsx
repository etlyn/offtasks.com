interface CategorySelectorProps {
  selected: "today" | "tomorrow" | "upcoming";
  onChange: (category: "today" | "tomorrow" | "upcoming") => void;
}

export function CategorySelector({ selected, onChange }: CategorySelectorProps) {
  return (
    <div className="relative h-[32px] w-full" data-name="CategorySelector">
      {/* Background pill - slightly inset to create the "pop out" effect */}
      <div className="absolute bg-zinc-200 dark:bg-zinc-700 bottom-[9%] left-0 right-0 rounded-[8px] top-[9%]" />
      
      {/* Today button */}
      <button
        onClick={() => onChange("today")}
        className={`absolute left-0 top-0 bottom-0 w-[33.33%] rounded-[8px] transition-all duration-200 flex items-center justify-center ${
          selected === "today" ? "bg-sky-500 dark:bg-sky-600 shadow-sm z-10" : "hover:bg-zinc-300 dark:hover:bg-zinc-600"
        }`}
      >
        <p className={`font-['Poppins',_sans-serif] leading-[1.4] not-italic text-[12px] text-nowrap transition-colors ${
          selected === "today" ? "text-white" : "text-zinc-600 dark:text-neutral-50"
        }`}>
          Today
        </p>
      </button>
      
      {/* Tomorrow button */}
      <button
        onClick={() => onChange("tomorrow")}
        className={`absolute left-[33.33%] top-0 bottom-0 w-[33.34%] rounded-[8px] transition-all duration-200 flex items-center justify-center ${
          selected === "tomorrow" ? "bg-sky-500 dark:bg-sky-600 shadow-sm z-10" : "hover:bg-zinc-300 dark:hover:bg-zinc-600"
        }`}
      >
        <p className={`font-['Poppins',_sans-serif] leading-[1.4] not-italic text-[12px] text-nowrap transition-colors ${
          selected === "tomorrow" ? "text-white" : "text-zinc-600 dark:text-neutral-50"
        }`}>
          Tomorrow
        </p>
      </button>
      
      {/* Upcoming button */}
      <button
        onClick={() => onChange("upcoming")}
        className={`absolute left-[66.67%] top-0 bottom-0 w-[33.33%] rounded-[8px] transition-all duration-200 flex items-center justify-center ${
          selected === "upcoming" ? "bg-sky-500 dark:bg-sky-600 shadow-sm z-10" : "hover:bg-zinc-300 dark:hover:bg-zinc-600"
        }`}
      >
        <p className={`font-['Poppins',_sans-serif] leading-[1.4] not-italic text-[12px] text-nowrap transition-colors ${
          selected === "upcoming" ? "text-white" : "text-zinc-600 dark:text-neutral-50"
        }`}>
          Upcoming
        </p>
      </button>
      
      {/* Dividers - only show when buttons are not selected */}
      <div className={`absolute flex left-[33.33%] top-[20%] bottom-[20%] items-center justify-center pointer-events-none transition-opacity ${
        selected === "today" || selected === "tomorrow" ? "opacity-0" : "opacity-100"
      }`}>
        <div className="h-full w-px bg-zinc-300 dark:bg-zinc-600" />
      </div>
      <div className={`absolute flex left-[66.67%] top-[20%] bottom-[20%] items-center justify-center pointer-events-none transition-opacity ${
        selected === "tomorrow" || selected === "upcoming" ? "opacity-0" : "opacity-100"
      }`}>
        <div className="h-full w-px bg-zinc-300 dark:bg-zinc-600" />
      </div>
    </div>
  );
}
