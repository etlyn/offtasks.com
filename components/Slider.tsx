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
  return (
    <div className="flex flex-grow  justify-around items-center rounded-2xl text-zinc-50 max-h-9 bg-zinc-700">
      <div className="flex basis-1/3 flex-grow justify-center">
        <button
          onClick={() => onClick1()}
          className={`py-2 px-4 rounded-l-2xl ${
            isLabel1Active && "bg-zinc-50 rounded-2xl z-10"
          }`}
        >
          <h1 className={`md:px-4 px-2 ${isLabel1Active && "text-zinc-900"}`}>
            {label1}
          </h1>
        </button>

        <div className={`py-3  w-0.5 ${isLabel3Active && "bg-zinc-800"}`} />
      </div>

      <div className="flex basis-1/3 flex-grow justify-center">
        <button
          onClick={() => onClick2()}
          className={`py-2 px-4 ${isLabel2Active && "bg-zinc-50 rounded-2xl"}`}
        >
          <h1 className={`${isLabel2Active && "text-zinc-900"}`}>{label2}</h1>
        </button>

        <div className={`py-3 w-0.5 ${isLabel1Active && "bg-zinc-800"}`} />
      </div>

      <div className="flex basis-1/3 flex-grow justify-center">
        <button
          onClick={() => onClick3()}
          className={`py-2 px-4 rounded-r-2xl ${
            isLabel3Active && "bg-zinc-50 rounded-2xl"
          }`}
        >
          <h1 className={`md:px-4 px-2 ${isLabel3Active && "text-zinc-900"}`}>
            {label3}
          </h1>
        </button>
      </div>
    </div>
  );
};
