import { motion, AnimatePresence } from "motion/react";
import svgPaths from "../imports/svg-gcwartiq9w";

interface UndoNotificationProps {
  isVisible: boolean;
  onUndo: () => void;
  onClose: () => void;
}

export function UndoNotification({ isVisible, onUndo, onClose }: UndoNotificationProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-[40px] right-[40px] bg-zinc-800 dark:bg-zinc-800 h-[48px] overflow-clip rounded-[8px] w-[180px] z-50 flex items-center"
        >
          <button
            onClick={onUndo}
            className="box-border content-stretch flex gap-[4px] h-[48px] items-center justify-center px-[20px] py-[14px] hover:bg-zinc-700 transition-colors flex-1"
          >
            <div className="relative shrink-0 size-[24px]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                <g>
                  <path
                    d={svgPaths.pfab74f0}
                    stroke="#0EA5E9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </g>
              </svg>
            </div>
            <div className="flex flex-col font-['Poppins',_sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[16px] text-center text-nowrap text-sky-500">
              <p className="leading-[1.4] whitespace-pre">Undo</p>
            </div>
          </button>

          <div className="w-[1px] h-[38px] bg-zinc-600" />

          <button
            onClick={onClose}
            className="w-[48px] h-[48px] flex items-center justify-center hover:bg-zinc-700 transition-colors"
          >
            <div className="size-[24px]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                <g>
                  <path
                    d="M6 18L18 6M6 6L18 18"
                    stroke="#FAFAFA"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </g>
              </svg>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
