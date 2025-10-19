import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Check, ChevronDown } from "lucide-react";
import { getCategoryConfig, getDefaultCategoryColor } from "../utils/categoryConfig";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import svgPaths from "../imports/svg-aum7itla9p";

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string, category: string, priority?: "low" | "medium" | "high", label?: string) => void;
  onDelete?: () => void;
  initialText?: string;
  initialCategory?: string;
  initialPriority?: "low" | "medium" | "high";
  initialLabel?: string;
  availableCategories: string[];
  isEditing?: boolean;
}

export function TaskDialog({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialText = "",
  initialCategory = "today",
  initialPriority,
  initialLabel,
  availableCategories,
  isEditing = false,
}: TaskDialogProps) {
  const [text, setText] = useState(initialText);
  const [category, setCategory] = useState(initialCategory);
  const [priority, setPriority] = useState<"low" | "medium" | "high" | undefined>(initialPriority);
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(initialLabel);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [priorityOpen, setPriorityOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setCategory(initialCategory);
      setPriority(initialPriority);
      setSelectedLabel(initialLabel);
      setCategoryOpen(false);
      setCategorySearch("");
      setPriorityOpen(false);
    }
  }, [isOpen, initialText, initialCategory, initialPriority, initialLabel]);

  const getPlaceholder = () => {
    switch (category) {
      case "today":
        return "What needs to be done today?";
      case "tomorrow":
        return "What's on your agenda for tomorrow?";
      case "upcoming":
        return "What's coming up?";
      default:
        return "Enter task description...";
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === "Enter" && e.metaKey && isOpen && text.trim()) {
        handleSave();
      }
    };

    window.addEventListener("keydown", handleEscape);
    window.addEventListener("keydown", handleEnter);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("keydown", handleEnter);
    };
  }, [isOpen, text]);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim(), category, priority, selectedLabel);
      setText("");
      setPriority(undefined);
      setSelectedLabel(undefined);
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 rounded-[12px] p-[24px] w-[90%] max-w-[550px] z-50 border border-zinc-800 shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-[20px] size-[20px] top-[20px] hover:opacity-70 transition-opacity"
            >
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
                <path d={svgPaths.p23458280} stroke="#9F9FA9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
              </svg>
            </button>

            {/* Title */}
            <h2 className="font-['Poppins',_sans-serif] text-[16px] text-zinc-100 mb-[24px]">
              {isEditing ? "Edit Task" : "New Task"}
            </h2>

            {/* Task Field */}
            <div className="mb-[24px]">
              <label className="block font-['Inter',_sans-serif] text-[#9f9fa9] text-[12px] mb-[8px]">
                Task
              </label>
              <div className="relative">
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                  }}
                  placeholder={getPlaceholder()}
                  autoFocus
                  className="w-full h-[96px] bg-transparent border border-zinc-700 rounded-[8px] p-[12px] text-[#71717b] font-['Poppins',_sans-serif] text-[14px] resize-none focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-[#71717b]"
                />
                {text.length > 0 && (
                  <div className="absolute bottom-[10px] right-[12px] bg-zinc-900 rounded-[4px] px-[6px] py-[2px]">
                    <span className="font-['Inter',_sans-serif] text-[#71717b] text-[10px] tracking-[0.1172px]">
                      {text.length}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* When Selector */}
            <div className="mb-[24px]">
              <label className="block font-['Inter',_sans-serif] text-[#9f9fa9] text-[12px] mb-[8px]">
                When
              </label>
              <div className="relative bg-[#3f3f47] h-[32px] rounded-[8px] flex items-center">
                <button
                  onClick={() => setCategory("today")}
                  className={`flex-1 h-[32px] rounded-[8px] flex items-center justify-center font-['Poppins',_sans-serif] text-[12px] transition-all ${
                    category === "today"
                      ? "bg-[#0084d1] text-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
                      : "text-neutral-50"
                  }`}
                >
                  Today
                </button>
                {category !== "today" && category !== "tomorrow" && (
                  <div className="bg-[#52525c] w-px h-[19.203px]" />
                )}
                <button
                  onClick={() => setCategory("tomorrow")}
                  className={`flex-1 h-[32px] rounded-[8px] flex items-center justify-center font-['Poppins',_sans-serif] text-[12px] transition-all ${
                    category === "tomorrow"
                      ? "bg-[#0084d1] text-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
                      : "text-neutral-50"
                  }`}
                >
                  Tomorrow
                </button>
                <div className="bg-[#52525c] w-px h-[19.203px]" />
                <button
                  onClick={() => setCategory("upcoming")}
                  className={`flex-1 h-[32px] rounded-[8px] flex items-center justify-center font-['Poppins',_sans-serif] text-[12px] transition-all ${
                    category === "upcoming"
                      ? "bg-[#0084d1] text-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
                      : "text-neutral-50"
                  }`}
                >
                  Upcoming
                </button>
              </div>
            </div>

            {/* Priority and Category */}
            <div className="flex gap-[12px] mb-[24px]">
              {/* Priority */}
              <div className="flex-1">
                <label className="block font-['Inter',_sans-serif] text-[#9f9fa9] text-[12px] mb-[8px]">
                  Priority
                </label>
                <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full h-[36px] bg-[rgba(38,38,38,0.3)] border border-zinc-700 rounded-[8px] px-[13px] flex items-center justify-between transition-colors hover:bg-[rgba(38,38,38,0.5)]"
                    >
                      <div className="flex items-center gap-1.5">
                        {priority === "high" && (
                          <span className="font-['Poppins',_sans-serif] text-[#ff6467] text-[13px]">High</span>
                        )}
                        {priority === "medium" && (
                          <span className="font-['Poppins',_sans-serif] text-[#ffa500] text-[13px]">Medium</span>
                        )}
                        {priority === "low" && (
                          <span className="font-['Poppins',_sans-serif] text-[#2b7fff] text-[13px]">Low</span>
                        )}
                        {!priority && (
                          <span className="font-['Poppins',_sans-serif] text-zinc-400 text-[13px]">None</span>
                        )}
                      </div>
                      <div className="relative shrink-0 size-[16px] opacity-50">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
                          <path d="M4 6L8 10L12 6" stroke="#A1A1A1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        </svg>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="p-0 bg-zinc-900 border-zinc-800" 
                    align="start"
                    style={{ width: 'var(--radix-popover-trigger-width)' }}
                  >
                    <Command className="bg-transparent">
                      <CommandList>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setPriority(undefined);
                              setPriorityOpen(false);
                            }}
                            className="font-['Poppins',_sans-serif] text-[13px]"
                          >
                            <span className="text-zinc-400">None</span>
                          </CommandItem>
                          <CommandItem
                            value="high"
                            onSelect={() => {
                              setPriority("high");
                              setPriorityOpen(false);
                            }}
                            className="font-['Poppins',_sans-serif] text-[13px]"
                          >
                            <span className="text-[#ff6467]">High</span>
                          </CommandItem>
                          <CommandItem
                            value="medium"
                            onSelect={() => {
                              setPriority("medium");
                              setPriorityOpen(false);
                            }}
                            className="font-['Poppins',_sans-serif] text-[13px]"
                          >
                            <span className="text-[#ffa500]">Medium</span>
                          </CommandItem>
                          <CommandItem
                            value="low"
                            onSelect={() => {
                              setPriority("low");
                              setPriorityOpen(false);
                            }}
                            className="font-['Poppins',_sans-serif] text-[13px]"
                          >
                            <span className="text-[#2b7fff]">Low</span>
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Category */}
              <div className="flex-1">
                <label className="block font-['Inter',_sans-serif] text-[#9f9fa9] text-[12px] mb-[8px]">
                  Category
                </label>
                <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full h-[36px] bg-[rgba(38,38,38,0.3)] border border-zinc-700 rounded-[8px] px-[13px] flex items-center justify-between transition-colors hover:bg-[rgba(38,38,38,0.5)]"
                    >
                      {selectedLabel ? (
                        <div className="flex items-center gap-[6px]">
                          {(() => {
                            const config = getCategoryConfig(selectedLabel) || getDefaultCategoryColor();
                            return (
                              <>
                                <span className={`size-[6px] rounded-full ${config.dotColor}`} />
                                <span className="font-['Poppins',_sans-serif] text-zinc-300 text-[13px]">{selectedLabel}</span>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="font-['Poppins',_sans-serif] text-zinc-400 text-[13px]">None</span>
                      )}
                      <div className="relative shrink-0 size-[16px] opacity-50">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
                          <path d="M4 6L8 10L12 6" stroke="#D4D4D8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        </svg>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="p-0 bg-zinc-900 border-zinc-800" 
                    align="start"
                    style={{ width: 'var(--radix-popover-trigger-width)' }}
                  >
                    <Command className="bg-transparent">
                      <CommandInput 
                        placeholder="Search or create category..." 
                        className="h-9 font-['Poppins',_sans-serif] text-[13px]"
                        value={categorySearch}
                        onValueChange={setCategorySearch}
                      />
                      <CommandList>
                        <CommandEmpty className="py-6 text-center text-[13px]">
                          <button
                            type="button"
                            onClick={() => {
                              if (categorySearch.trim()) {
                                setSelectedLabel(categorySearch.trim());
                                setCategoryOpen(false);
                                setCategorySearch("");
                              }
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-zinc-800 rounded-sm transition-colors flex items-center gap-2 text-sky-400 font-['Poppins',_sans-serif] text-[13px]"
                          >
                            <Plus className="size-4" />
                            <span>Add category: "{categorySearch}"</span>
                          </button>
                        </CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__none__"
                            onSelect={() => {
                              setSelectedLabel(undefined);
                              setCategoryOpen(false);
                              setCategorySearch("");
                            }}
                            className="font-['Poppins',_sans-serif] text-[13px]"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                !selectedLabel ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <span className="text-zinc-400">None</span>
                          </CommandItem>
                          {availableCategories.map((cat) => {
                            const config = getCategoryConfig(cat) || getDefaultCategoryColor();
                            return (
                              <CommandItem
                                key={cat}
                                value={cat}
                                onSelect={() => {
                                  setSelectedLabel(cat);
                                  setCategoryOpen(false);
                                  setCategorySearch("");
                                }}
                                className="font-['Poppins',_sans-serif] text-[13px]"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedLabel === cat ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <div className="flex items-center gap-[6px]">
                                  <span className={`size-[6px] rounded-full ${config.dotColor}`} />
                                  <span className="text-zinc-300">{cat}</span>
                                </div>
                              </CommandItem>
                            );
                          })}
                          {categorySearch && !availableCategories.some(cat => cat.toLowerCase() === categorySearch.toLowerCase()) && (
                            <CommandItem
                              value={`__create__${categorySearch}`}
                              onSelect={() => {
                                if (categorySearch.trim()) {
                                  setSelectedLabel(categorySearch.trim());
                                  setCategoryOpen(false);
                                  setCategorySearch("");
                                }
                              }}
                              className="font-['Poppins',_sans-serif] text-[13px] border-t border-zinc-800 mt-1"
                            >
                              <Plus className="mr-2 h-4 w-4 text-sky-400" />
                              <span className="text-sky-400">Add category: "{categorySearch}"</span>
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-[8px] justify-end pt-[17px] border-t border-zinc-800 mt-[40px] mr-[0px] mb-[0px] ml-[0px]">
              {isEditing && onDelete && (
                <button
                  onClick={handleDelete}
                  className="h-[32px] px-[16px] rounded-[8px] border border-[#ff6467] bg-transparent hover:bg-[#ff6467]/10 transition-colors flex items-center gap-[6px]"
                >
                  <div className="relative size-[14px]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
                      <path d={svgPaths.p1e33adf8} stroke="#FF6467" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                    </svg>
                  </div>
                  <span className="font-['Poppins',_sans-serif] text-[#ff6467] text-[13px]">Delete</span>
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!text.trim()}
                className="h-[32px] px-[20px] rounded-[8px] bg-[#0084d1] hover:bg-[#0084d1]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="font-['Poppins',_sans-serif] text-white text-[13px]">
                  {isEditing ? "Update" : "Save"}
                </span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
