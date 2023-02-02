import React, { useContext } from "react";
import { Account } from "./Account";
import { Logo, RocketIcon } from "../icons";
import { AppContext } from "../context";
import { useRouter } from "next/router";
import { ThemeSwitch } from "./ThemeSwitch";
import { useTheme } from "next-themes";

export const Header = () => {
  const { context } = useContext(AppContext);
  const router = useRouter();
  const { theme } = useTheme();

  const handleReload = () => {
    router.push("/");
  };

  return (
    <div
      className={`${
        theme === "dark"
          ? "bg-zinc-800 border-zinc-50"
          : "bg-slate-50 border-zinc-900"
      } pt-4 pb-2 px-6 md:px-24 flex justify-between border-b border-opacity-10`}
    >
      <button onClick={handleReload}>
        <Logo />
      </button>
      <div
        className={`ml-8 ${
          theme === "dark" ? "text-zinc-50" : "text-zinc-900"
        } flex flex-row -mt-1 items-center`}
      >
        <RocketIcon />
        <h1 className="mx-2">
          {context.completedTasks} of {context.totalTasks}
        </h1>
      </div>
      <div
        className={`flex justify-center items-center ${
          theme === "dark" ? "text-zinc-50" : "text-zinc-900"
        } flex flex-row -mt-1 items-center`}
      >
        <ThemeSwitch />
        <Account />
      </div>
    </div>
  );
};
