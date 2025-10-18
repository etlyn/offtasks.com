import { useTheme } from "next-themes";
import React from "react";

type TSlider = {
  label1: string;
  label2: string;
  label3: string;
  onClick1?: Function;
  onClick2?: Function;
  onClick3?: Function;
  isLabel1Active?: boolean;
  isLabel2Active?: boolean;
  isLabel3Active?: boolean;
};

export const Slider = ({
  label1,
  label2,
  label3,
  onClick1 = () => {},
  onClick2 = () => {},
  onClick3 = () => {},
  isLabel1Active,
  isLabel2Active,
  isLabel3Active,
}: TSlider) => {
  const { theme } = useTheme();
  return (
    <div
      className={`flex rounded-lg p-1 ${
        theme === "dark" ? "bg-zinc-700" : "bg-zinc-200"
      }`}
    >
      <button
        onClick={() => onClick1()}
        className={`flex flex-1 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition ${
          isLabel1Active
            ? theme === "dark"
              ? "bg-white text-zinc-900"
              : "bg-zinc-600 text-white"
            : theme === "dark"
            ? "text-zinc-300 hover:text-white"
            : "text-zinc-700 hover:text-zinc-900"
        }`}
      >
        {label1}
      </button>

      <button
        onClick={() => onClick2()}
        className={`flex flex-1 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition ${
          isLabel2Active
            ? theme === "dark"
              ? "bg-white text-zinc-900"
              : "bg-zinc-600 text-white"
            : theme === "dark"
            ? "text-zinc-300 hover:text-white"
            : "text-zinc-700 hover:text-zinc-900"
        }`}
      >
        {label2}
      </button>

      <button
        onClick={() => onClick3()}
        className={`flex flex-1 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition ${
          isLabel3Active
            ? theme === "dark"
              ? "bg-white text-zinc-900"
              : "bg-zinc-600 text-white"
            : theme === "dark"
            ? "text-zinc-300 hover:text-white"
            : "text-zinc-700 hover:text-zinc-900"
        }`}
      >
        {label3}
      </button>
    </div>
  );
};
