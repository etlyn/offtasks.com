import React, { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { supabaseClient } from "@/lib/supabase";

export const AccountMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
        className="flex items-center justify-center rounded-full border border-zinc-200 bg-white p-2 text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Account</span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 mt-2 w-32 rounded-md border border-zinc-200 bg-white shadow-lg focus:outline-none dark:border-zinc-700 dark:bg-zinc-800">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
};
