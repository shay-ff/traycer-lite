'use client';

import { useState, useCallback } from 'react';
import { Plan } from '@/types';
import { usePlanState } from './usePlanState';
import { useStepExecution } from './useStepExecution';

interface AppError {
  message: string;
  type: 'api' | 'validation' | 'network' | 'unknown';
  timestamp: number;
}

interface UseAppStateReturn {
  // Plan state
  currentPlan: Plan | null;
  codeContext: string;
  setCurrentPlan: (plan: Plan | null) => void;
  setCodeContext: (context: string) => void;
  
  // UI state
  isGeneratingPlan: boolean;
  setIsGeneratingPlan: (loading: boolean) => void;
  error: AppError | null;
  setError: (error: string | null, type?: AppError['type']) => void;
  clearError: () => void;
  
  // Step execution state (re-exported from useStepExecution)
  stepExecutions: ReturnType<typeof useStepExecution>['stepExecutions'];
  executingSteps: ReturnType<typeof useStepExecution>['executingSteps'];
  acceptedSteps: ReturnType<typeof useStepExecution>['acceptedSteps'];
  executeStepById: ReturnType<typeof useStepExecution>['executeStepById'];
  acceptPatch: ReturnType<typeof useStepExecution>['acceptPatch'];
  copyPatch: ReturnType<typeof useStepExecution>['copyPatch'];
  regenerateStep: ReturnType<typeof useStepExecution>['regenerateStep'];
  clearAllExecutions: ReturnType<typeof useStepExecution>['clearAllExecutions'];
  
  // Combined actions
  startOver: () => void;
  resetApplication: () => void;
}

export const useAppState = (): UseAppStateReturn => {
  // Plan state management
  const {
    currentPlan,
    codeContext,
    setCurrentPlan,
    setCodeContext,
    clearState: clearPlanState,
  } = usePlanState();

  // Step execution management
  const stepExecutionHook = useStepExecution();

  // UI state
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [error, setErrorState] = useState<AppError | null>(null);

  // Error management
  const setError = useCallback((message: string | null, type: AppError['type'] = 'unknown') => {
    if (message) {
      setErrorState({
        message,
        type,
        timestamp: Date.now(),
      });
    } else {
      setErrorState(null);
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  // Combined actions
  const startOver = useCallback(() => {
    setCurrentPlan(null);
    setCodeContext('');
    setErrorState(null);
    stepExecutionHook.clearAllExecutions();
  }, [setCurrentPlan, setCodeContext, stepExecutionHook]);

  const resetApplication = useCallback(() => {
    clearPlanState();
    setErrorState(null);
    setIsGeneratingPlan(false);
    stepExecutionHook.clearAllExecutions();
  }, [clearPlanState, stepExecutionHook]);

  return {
    // Plan state
    currentPlan,
    codeContext,
    setCurrentPlan,
    setCodeContext,
    
    // UI state
    isGeneratingPlan,
    setIsGeneratingPlan,
    error,
    setError,
    clearError,
    
    // Step execution state
    stepExecutions: stepExecutionHook.stepExecutions,
    executingSteps: stepExecutionHook.executingSteps,
    acceptedSteps: stepExecutionHook.acceptedSteps,
    executeStepById: stepExecutionHook.executeStepById,
    acceptPatch: stepExecutionHook.acceptPatch,
    copyPatch: stepExecutionHook.copyPatch,
    regenerateStep: stepExecutionHook.regenerateStep,
    clearAllExecutions: stepExecutionHook.clearAllExecutions,
    
    // Combined actions
    startOver,
    resetApplication,
  };
};