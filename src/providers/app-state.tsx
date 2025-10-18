import React, { createContext, useMemo, useState } from "react";
import type { AppStateContextValue, TasksState } from "@/types";

const defaultContext: AppStateContextValue = {
  appState: null,
  setAppState: () => {
    throw new Error("setAppState must be used within AppStateProvider");
  },
};

export const AppStateContext = createContext<AppStateContextValue>(defaultContext);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [appState, setAppState] = useState<TasksState | null>(null);

  const value = useMemo(
    () => ({
      appState,
      setAppState,
    }),
    [appState]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};
