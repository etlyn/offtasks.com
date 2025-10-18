import React, { useEffect, useMemo, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { supabaseClient } from "@/lib/supabase";

export const AccountMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const user = supabaseClient.auth.user();

  const userInitials = useMemo(() => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    if (user?.id) {
      return user.id.charAt(0).toUpperCase();
    }
    return "O";
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    setIsOpen((previous) => !previous);
  };

  const handleLogout = async () => {
    try {
      await supabaseClient.auth.signOut();
      setIsOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error during logout", message);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/80 text-sm font-medium text-zinc-700 shadow-[0_10px_30px_rgba(15,118,230,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-md focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 dark:border-zinc-700/60 dark:bg-zinc-900/80 dark:text-zinc-100"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span>{userInitials}</span>
        <span className="sr-only">Account</span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 mt-3 w-48 rounded-2xl border border-white/60 bg-white/90 p-3 shadow-[0_24px_60px_rgba(15,118,230,0.14)] backdrop-blur-lg focus:outline-none dark:border-zinc-700/60 dark:bg-zinc-900/90">
          {user?.email ? (
            <div className="mb-3 rounded-xl bg-white/70 px-3 py-2 text-[13px] text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
              {user.email}
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
};
