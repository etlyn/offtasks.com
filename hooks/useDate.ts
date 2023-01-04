import React from "react";

export const useDate = () => {
  const currentDate = new Date();

  const today =
    currentDate.getFullYear() +
    "-" +
    (currentDate.getMonth() + 1).toString().padStart(2, "0") +
    "-" +
    currentDate.getDate().toString().padStart(2, "0");

  const tomorrow =
    currentDate.getFullYear() +
    "-" +
    (currentDate.getMonth() + 1).toString().padStart(2, "0") +
    "-" +
    (currentDate.getDate() + 1).toString().padStart(2, "0");

  const yesterday =
    currentDate.getFullYear() +
    "-" +
    (currentDate.getMonth() + 1).toString().padStart(2, "0") +
    "-" +
    (currentDate.getDate() - 1).toString().padStart(2, "0");

  const upcoming =
    currentDate.getFullYear() +
    10 +
    "-" +
    (currentDate.getMonth() + 1).toString().padStart(2, "0") +
    "-" +
    currentDate.getDate().toString().padStart(2, "0");

  const outdated =
    currentDate.getFullYear() +
    "-" +
    (currentDate.getMonth() + 1).toString().padStart(2, "0") +
    "-" +
    (currentDate.getDate() - 14).toString().padStart(2, "0");

  return { today, tomorrow, yesterday, upcoming, outdated };
};
