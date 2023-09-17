import React, { createContext, useState } from "react";

export const AppState = createContext<any>({});

export const ContextProvider = ({ children }) => {
  const [appState, setAppState] = useState();

  return (
    <AppState.Provider value={{ appState, setAppState }}>
      {children}
    </AppState.Provider>
  );
};
