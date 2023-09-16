import React from "react";

export const DragIcon = ({className}: any) => {
  return (
      <svg
        width="24"
        height="24"
        viewBox="-2 -2 24 24"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-8 h-8 px-1 stroke-transparent ${className}`}
      >
        <circle cx="4" cy="4" r="2" fill="currentColor" />
        <circle cx="12" cy="4" r="2" fill="currentColor" />
        <circle cx="4" cy="12" r="2" fill="currentColor" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <circle cx="4" cy="20" r="2" fill="currentColor" />
        <circle cx="12" cy="20" r="2" fill="currentColor" />
      </svg>
  );
};
