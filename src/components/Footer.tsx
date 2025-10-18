import React from "react";

export const Footer = () => (
  <footer className="mx-6 mt-24 border-t border-zinc-200 py-6 text-center text-sm font-light text-zinc-500 dark:border-zinc-700 dark:text-zinc-400 md:mx-24 md:mt-8 md:text-base">
    © {new Date().getFullYear()} offtasks.com
  </footer>
);
