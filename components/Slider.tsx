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
      className={`flex flex-grow rounded-2xl ${
        theme === "dark"
          ? "bg-zinc-700 text-zinc-50"
          : "bg-zinc-200 text-zinc-900"
      }`}
    >
      <div className="flex basis-1/3 flex-grow justify-center">
        <button
          onClick={() => onClick1()}
          className={`flex flex-grow justify-center items-center rounded-l-2xl ${
            isLabel1Active &&
            `${
              theme === "dark"
                ? "bg-zinc-50 text-zinc-900"
                : "bg-zinc-600 text-zinc-50"
            } rounded-2xl py-1`
          }`}
        >
          <h1>{label1}</h1>
        </button>

        <div
          className={`py-3  w-0.5 ${
            isLabel3Active &&
            `${theme === "dark" ? "bg-zinc-800" : "bg-zinc-50"}`
          }`}
        />
      </div>

      <div className="flex basis-1/3 flex-grow justify-center">
        <button
          onClick={() => onClick2()}
          className={`flex flex-grow justify-center items-center rounded-l-2xl ${
            isLabel2Active &&
            `${
              theme === "dark"
                ? "bg-zinc-50 text-zinc-900"
                : "bg-zinc-600 text-zinc-50"
            } rounded-2xl py-1`
          }`}
        >
          <h1>{label2}</h1>
        </button>

        <div
          className={`py-3  w-0.5 ${
            isLabel1Active &&
            `${theme === "dark" ? "bg-zinc-800" : "bg-zinc-50"}`
          }`}
        />
      </div>

      <div className="flex basis-1/3 flex-grow justify-center">
        <button
          onClick={() => onClick3()}
          className={`flex flex-grow justify-center items-center rounded-l-2xl ${
            isLabel3Active &&
            `${
              theme === "dark"
                ? "bg-zinc-50 text-zinc-900"
                : "bg-zinc-600 text-zinc-50"
            } rounded-2xl py-1`
          }`}
        >
          <h1>{label3}</h1>
        </button>
      </div>
    </div>
  );
};
