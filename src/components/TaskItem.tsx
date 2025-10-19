import { motion } from "motion/react";
import svgPaths from "../imports/svg-xj1j8w0l61";
import { getCategoryConfig, getDefaultCategoryColor } from "../utils/categoryConfig";

interface TaskItemProps {
  id: string;
  text: string;
  completed: boolean;
  overdue: boolean;
  onToggle: (id: string) => void;
  onClick: (id: string) => void;
  priority?: "low" | "medium" | "high";
  label?: string;
  showMetadata?: boolean;
}

export function TaskItem({ 
  id, 
  text, 
  completed, 
  overdue, 
  onToggle, 
  onClick, 
  priority,
  label,
  showMetadata = false 
}: TaskItemProps) {
  const getPriorityStrokeColor = () => {
    switch (priority) {
      case "high":
        return "#EF4444";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#3B82F6";
      default:
        return "";
    }
  };

  const renderPriorityFlag = () => {
    const strokeColor = getPriorityStrokeColor();
    
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path 
          d="M3 2L3 12M3 2L10 5L3 8" 
          stroke={strokeColor} 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill={strokeColor}
          fillOpacity="0.2"
        />
      </svg>
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ x: 4 }}
      transition={{ duration: 0.3 }}
      className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full group"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(id);
        }}
        className="overflow-clip relative shrink-0 size-[24px] flex-shrink-0 hover:scale-110 active:scale-95 transition-transform duration-200"
      >
        <div className="absolute inset-[12.5%]">
          <div className="absolute inset-[-5.556%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
              <g>
                <motion.rect
                  x="1"
                  y="1"
                  width="18"
                  height="18"
                  rx="5"
                  stroke={overdue && !completed ? "#EF4444" : completed ? "none" : "#A1A1AA"}
                  fill={completed ? "#0EA5E9" : "none"}
                  strokeWidth="2"
                  initial={false}
                  animate={{
                    fill: completed ? "#0EA5E9" : "none",
                    stroke: overdue && !completed ? "#EF4444" : completed ? "none" : "#A1A1AA"
                  }}
                  transition={{ duration: 0.2 }}
                  className={completed ? "" : "dark:stroke-zinc-300"}
                />
                {completed && (
                  <motion.path
                    d="M6 10L9 13L14 7"
                    stroke="#FFFFFF"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                )}
              </g>
            </svg>
          </div>
        </div>
      </button>
      <div 
        onClick={() => onClick(id)}
        className="flex-1 cursor-pointer"
      >
        <p
          className={`font-['Poppins',_sans-serif] font-normal leading-[1.4] text-[16px] transition-colors duration-200 ${
            completed
              ? "text-zinc-400 dark:text-zinc-500 line-through"
              : overdue
              ? "text-red-400 group-hover:text-red-500"
              : "text-zinc-900 dark:text-zinc-100 group-hover:text-sky-600 dark:group-hover:text-sky-400"
          }`}
        >
          {text}
        </p>
        {showMetadata && (priority || label) && (
          <div className="flex flex-wrap items-center gap-[6px] mt-[8px]">
            {priority && renderPriorityFlag()}
            {label && (() => {
              const config = getCategoryConfig(label) || getDefaultCategoryColor();
              return (
                <span className={`inline-flex items-center px-[8px] py-[3px] rounded-[6px] border font-['Poppins',_sans-serif] text-[11px] ${config.bgColor} ${config.borderColor} ${config.color}`}>
                  {label}
                </span>
              );
            })()}
          </div>
        )}
      </div>
    </motion.div>
  );
}
