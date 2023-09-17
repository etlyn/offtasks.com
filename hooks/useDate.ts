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

  return { today, tomorrow, yesterday };
};

export const getCurrentDate = () => {
  const currentDate = new Date();

  const today =
    currentDate.getFullYear() +
    "-" +
    (currentDate.getMonth() + 1).toString().padStart(2, "0") +
    "-" +
    currentDate.getDate().toString().padStart(2, "0");

  return today;
};
