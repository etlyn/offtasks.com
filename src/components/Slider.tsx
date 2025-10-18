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
  <div className="flex items-center rounded-2xl border border-white/10 bg-zinc-800/70 p-1 text-sm font-medium text-zinc-300 shadow-inner">
    <button
      type="button"
      onClick={onClick1}
      className={`flex flex-1 items-center justify-center rounded-2xl px-4 py-2 transition ${
        isLabel1Active
          ? "bg-sky-500 text-white shadow-[0_10px_30px_rgba(56,189,248,0.25)]"
          : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {label1}
    </button>

    <button
      type="button"
      onClick={onClick2}
      className={`flex flex-1 items-center justify-center rounded-2xl px-4 py-2 transition ${
        isLabel2Active
          ? "bg-sky-500 text-white shadow-[0_10px_30px_rgba(56,189,248,0.25)]"
          : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {label2}
    </button>

    <button
      type="button"
      onClick={onClick3}
      className={`flex flex-1 items-center justify-center rounded-2xl px-4 py-2 transition ${
        isLabel3Active
          ? "bg-sky-500 text-white shadow-[0_10px_30px_rgba(56,189,248,0.25)]"
          : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {label3}
    </button>
  </div>
);
