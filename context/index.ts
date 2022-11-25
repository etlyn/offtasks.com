import React, { createContext, useState } from "react";

type TContext = { todayTasks: any; tomorrowTasks: any; upcomingTasks: any };

export type TAppContext = {
  context: TContext | null;
  setContext: any;
};

export const AppContext = createContext(null);

export const ContextProvider = ({ children }) => {
  const [context, setContext] = useState({} as TAppContext);
  return (
    <AppContext.Provider value={{ context, setContext }}>
      {children}
    </AppContext.Provider>
  );
};
