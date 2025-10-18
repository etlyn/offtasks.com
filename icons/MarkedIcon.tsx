import React from "react";

export const MarkedIcon = ({ checkColor = "green" }) => {
  return (
    <>
      <svg
  width="20"
  height="20"
        viewBox="-2 -2 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
  className="h-5 w-5 stroke-transparent"
      >
        <path
          d="M15 1H5C2.79086 1 1 2.79086 1 5V15C1 17.2091 2.79086 19 5 19H15C17.2091 19 19 17.2091 19 15V5C19 2.79086 17.2091 1 15 1Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 10L9.25 12L13 8"
          stroke={checkColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
};
