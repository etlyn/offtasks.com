import React, { useContext } from "react";
import { Account } from "./Account";
import { Logo, RocketIcon } from "../icons";
import { AppContext } from "../context";
import { useRouter } from "next/router";

export const Header = () => {
  const { context } = useContext(AppContext);
  const router = useRouter();

  const handleReload = () => {
    router.push("/");
  };

  return (
    <div className="bg-zinc-800 pt-4 pb-2 px-6 md:px-24 flex justify-between  border-zinc-50 border-b border-opacity-10 ">
      <button onClick={handleReload}>
        <Logo />
      </button>
      <div className="flex flex-row -mt-1 items-center text-zinc-50">
        <RocketIcon />
        <h1 className="mx-2">
          {context.completedTasks} of {context.totalTasks}
        </h1>
      </div>
      <Account />
    </div>
  );
};
