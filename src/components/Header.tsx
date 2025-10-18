import React, { useContext } from "react";
import { useRouter } from "next/router";
import { Rocket } from "lucide-react";
import { AppStateContext } from "@/providers/app-state";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { AccountMenu } from "@/components/AccountMenu";
import { Logo } from "@/components/branding/Logo";

export const Header = () => {
  const { appState } = useContext(AppStateContext);
  const router = useRouter();

  const handleReload = () => {
    router.push("/");
  };

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 pb-2 pt-4 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-900 md:px-24">
      <button onClick={handleReload} aria-label="Go to dashboard">
        <Logo />
      </button>

      <div className="ml-8 flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
        <Rocket className="h-5 w-5" aria-hidden="true" />
        <p className="text-sm font-medium">
          {appState?.completedTasks ?? 0} of {appState?.totalTasks ?? 0}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <ThemeSwitch />
        <AccountMenu />
      </div>
    </header>
  );
};
