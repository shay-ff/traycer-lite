/**
 * Custom hook for managing step execution state and operations
 */

import { useState, useCallback, useRef } from 'react';
import { Step, StepExecution } from '@/types';
import { executeStep, getErrorMessage, isRetryableError } from '@/utils/api';

export interface UseStepExecutionReturn {
  stepExecutions: Map<string, StepExecution>;
  executingSteps: Set<string>;
  acceptedSteps: Set<string>;
  executionErrors: Map<string, string>;
  retryAttempts: Map<string, number>;
  executeStepById: (stepId: string, step: Step, codeContext: string) => Promise<void>;
  acceptPatch: (stepId: string) => void;
  copyPatch: (stepId: string) => void;
  regenerateStep: (stepId: string, step: Step, codeContext: string) => Promise<void>;
  clearExecution: (stepId: string) => void;
  clearAllExecutions: () => void;
  isExecuting: (stepId: string) => boolean;
  isAccepted: (stepId: string) => boolean;
  hasExecution: (stepId: string) => boolean;
  hasError: (stepId: string) => boolean;
  getError: (stepId: string) => string | undefined;
  canRetry: (stepId: string) => boolean;
}

export function useStepExecution(): UseStepExecutionReturn {
  const [stepExecutions, setStepExecutions] = useState<Map<string, StepExecution>>(new Map());
  const [executingSteps, setExecutingSteps] = useState<Set<string>>(new Set());
  const [acceptedSteps, setAcceptedSteps] = useState<Set<string>>(new Set());
  const [executionErrors, setExecutionErrors] = useState<Map<string, string>>(new Map());
  const [retryAttempts, setRetryAttempts] = useState<Map<string, number>>(new Map());
  
  // Keep track of abort controllers for ongoing requests
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Execute a step by ID
  const executeStepById = useCallback(async (stepId: string, step: Step, codeContext: string) => {
    // Cancel any existing execution for this step
    const existingController = abortControllersRef.current.get(stepId);
    if (existingController) {
      existingController.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllersRef.current.set(stepId, abortController);

    // Mark step as executing
    setExecutingSteps(prev => new Set([...prev, stepId]));
    
    // Clear any previous execution result, acceptance, and errors
    setStepExecutions(prev => {
      const newMap = new Map(prev);
      newMap.delete(stepId);
      return newMap;
    });
    
    setAcceptedSteps(prev => {
      const newSet = new Set(prev);
      newSet.delete(stepId);
      return newSet;
    });

    setExecutionErrors(prev => {
      const newMap = new Map(prev);
      newMap.delete(stepId);
      return newMap;
    });

    try {
      // Execute step with retry callback
      const result = await executeStep(step, codeContext, (attempt, error) => {
        console.log(`Step ${stepId} retry attempt ${attempt}:`, error.message);
        
        // Update retry attempts count
        setRetryAttempts(prev => new Map([...prev, [stepId, attempt]]));
      });
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      // Store execution result and clear retry attempts
      setStepExecutions(prev => new Map([...prev, [stepId, result]]));
      setRetryAttempts(prev => {
        const newMap = new Map(prev);
        newMap.delete(stepId);
        return newMap;
      });
      
    } catch (error) {
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      console.error(`Failed to execute step ${stepId}:`, error);
      
      // Store error message
      const errorMessage = getErrorMessage(error as Error);
      setExecutionErrors(prev => new Map([...prev, [stepId, errorMessage]]));
      
      // Clear retry attempts on final failure
      setRetryAttempts(prev => {
        const newMap = new Map(prev);
        newMap.delete(stepId);
        return newMap;
      });
      
    } finally {
      // Remove from executing steps
      setExecutingSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(stepId);
        return newSet;
      });
      
      // Clean up abort controller
      abortControllersRef.current.delete(stepId);
    }
  }, []);

  // Accept a patch for a step
  const acceptPatch = useCallback((stepId: string) => {
    setAcceptedSteps(prev => new Set([...prev, stepId]));
  }, []);

  // Copy patch to clipboard (handled by DiffViewer, but we track the action)
  const copyPatch = useCallback((stepId: string) => {
    // This is mainly for tracking/analytics purposes
    // The actual copy operation is handled by the DiffViewer component
    console.log(`Patch copied for step: ${stepId}`);
  }, []);

  // Regenerate a step (re-execute it)
  const regenerateStep = useCallback(async (stepId: string, step: Step, codeContext: string) => {
    await executeStepById(stepId, step, codeContext);
  }, [executeStepById]);

  // Clear execution result for a step
  const clearExecution = useCallback((stepId: string) => {
    // Cancel any ongoing execution
    const controller = abortControllersRef.current.get(stepId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(stepId);
    }

    setStepExecutions(prev => {
      const newMap = new Map(prev);
      newMap.delete(stepId);
      return newMap;
    });
    
    setExecutingSteps(prev => {
      const newSet = new Set(prev);
      newSet.delete(stepId);
      return newSet;
    });
    
    setAcceptedSteps(prev => {
      const newSet = new Set(prev);
      newSet.delete(stepId);
      return newSet;
    });

    setExecutionErrors(prev => {
      const newMap = new Map(prev);
      newMap.delete(stepId);
      return newMap;
    });

    setRetryAttempts(prev => {
      const newMap = new Map(prev);
      newMap.delete(stepId);
      return newMap;
    });
  }, []);

  // Clear all execution results
  const clearAllExecutions = useCallback(() => {
    // Cancel all ongoing executions
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();

    setStepExecutions(new Map());
    setExecutingSteps(new Set());
    setAcceptedSteps(new Set());
    setExecutionErrors(new Map());
    setRetryAttempts(new Map());
  }, []);

  // Helper functions
  const isExecuting = useCallback((stepId: string) => executingSteps.has(stepId), [executingSteps]);
  const isAccepted = useCallback((stepId: string) => acceptedSteps.has(stepId), [acceptedSteps]);
  const hasExecution = useCallback((stepId: string) => stepExecutions.has(stepId), [stepExecutions]);
  const hasError = useCallback((stepId: string) => executionErrors.has(stepId), [executionErrors]);
  const getError = useCallback((stepId: string) => executionErrors.get(stepId), [executionErrors]);
  const canRetry = useCallback((stepId: string) => {
    const error = executionErrors.get(stepId);
    return error ? isRetryableError(new Error(error)) : false;
  }, [executionErrors]);

  return {
    stepExecutions,
    executingSteps,
    acceptedSteps,
    executionErrors,
    retryAttempts,
    executeStepById,
    acceptPatch,
    copyPatch,
    regenerateStep,
    clearExecution,
    clearAllExecutions,
    isExecuting,
    isAccepted,
    hasExecution,
    hasError,
    getError,
    canRetry,
  };
}