import { motion, AnimatePresence } from "motion/react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDangerous = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-zinc-800 rounded-[16px] p-[32px] w-[90%] max-w-[400px] z-50 shadow-2xl border border-zinc-200 dark:border-zinc-700"
          >
            <h2 className="font-['Poppins',_sans-serif] text-[20px] text-zinc-900 dark:text-zinc-100 mb-[12px]">
              {title}
            </h2>
            
            <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400 mb-[24px]">
              {message}
            </p>

            <div className="flex gap-[12px] justify-end">
              <button
                onClick={onClose}
                className="px-[20px] py-[10px] rounded-[8px] font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-[20px] py-[10px] rounded-[8px] font-['Poppins',_sans-serif] text-[14px] transition-colors ${
                  isDangerous
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-sky-600 text-white hover:bg-sky-700"
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
