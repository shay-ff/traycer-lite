"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useAppState } from "@/hooks/useAppState";

type AppStateContextType = ReturnType<typeof useAppState>;

const AppStateContext = createContext<AppStateContextType | undefined>(
  undefined
);

interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({
  children,
}) => {
  const appState = useAppState();

  return (
    <AppStateContext.Provider value={appState}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppStateContext = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error(
      "useAppStateContext must be used within an AppStateProvider"
    );
  }
  return context;
};

// Optional: Export individual state selectors for performance optimization
export const useCurrentPlan = () => {
  const { currentPlan } = useAppStateContext();
  return currentPlan;
};

export const useCodeContext = () => {
  const { codeContext } = useAppStateContext();
  return codeContext;
};

export const useAppError = () => {
  const { error, setError, clearError } = useAppStateContext();
  return { error, setError, clearError };
};

export const useStepExecutionState = () => {
  const {
    stepExecutions,
    executingSteps,
    acceptedSteps,
    executeStepById,
    acceptPatch,
    copyPatch,
    regenerateStep,
    clearAllExecutions,
  } = useAppStateContext();

  return {
    stepExecutions,
    executingSteps,
    acceptedSteps,
    executeStepById,
    acceptPatch,
    copyPatch,
    regenerateStep,
    clearAllExecutions,
  };
};
