import React from "react";

type SliderProps = {
  label1: string;
  label2: string;
  label3: string;
  onClick1?: () => void;
  onClick2?: () => void;
  onClick3?: () => void;
  isLabel1Active?: boolean;
  isLabel2Active?: boolean;
  isLabel3Active?: boolean;
};

export const Slider = ({
  label1,
  label2,
  label3,
  onClick1,
  onClick2,
  onClick3,
  isLabel1Active,
  isLabel2Active,
  isLabel3Active,
}: SliderProps) => (
  <div className="flex rounded-lg bg-zinc-200 p-1 dark:bg-zinc-700">
    <button
      type="button"
      onClick={onClick1}
      className={`flex flex-1 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 dark:focus:ring-cyan-400 ${
        isLabel1Active
          ? "bg-zinc-600 text-white dark:bg-white dark:text-zinc-900"
          : "text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
      }`}
    >
      {label1}
    </button>

    <button
      type="button"
      onClick={onClick2}
      className={`flex flex-1 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 dark:focus:ring-cyan-400 ${
        isLabel2Active
          ? "bg-zinc-600 text-white dark:bg-white dark:text-zinc-900"
          : "text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
      }`}
    >
      {label2}
    </button>

    <button
      type="button"
      onClick={onClick3}
      className={`flex flex-1 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 dark:focus:ring-cyan-400 ${
        isLabel3Active
          ? "bg-zinc-600 text-white dark:bg-white dark:text-zinc-900"
          : "text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
      }`}
    >
      {label3}
    </button>
  </div>
);
