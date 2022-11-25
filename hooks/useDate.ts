import React from "react";

export const useDate = () => {
  const currentDate = new Date();

  const today =
    currentDate.getFullYear() +
    "-" +
    (currentDate.getMonth() + 1) +
    "-" +
    currentDate.getDate();

  const tomorrow =
    currentDate.getFullYear() +
    "-" +
    (currentDate.getMonth() + 1) +
    "-" +
    (currentDate.getDate() + 1);

  const yesterday =
    currentDate.getFullYear() +
    "-" +
    (currentDate.getMonth() + 1) +
    "-" +
    (currentDate.getDate() - 1);

  const upcoming =
    currentDate.getFullYear() +
    "-" +
    (currentDate.getMonth() + 1) +
    "-" +
    (currentDate.getDate() + 2);

  const outdated =
    currentDate.getFullYear() +
    "-" +
    (currentDate.getMonth() + 1) +
    "-" +
    (currentDate.getDate() - 2);

  return { today, tomorrow, yesterday, upcoming, outdated };
};
