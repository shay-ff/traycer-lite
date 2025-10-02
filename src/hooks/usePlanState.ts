'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plan } from '@/types';

const STORAGE_KEY = 'coding-agent-planner-state';
const STORAGE_VERSION = '1.0';

interface PlanState {
  version: string;
  currentPlan: Plan | null;
  codeContext: string;
  lastUpdated: number;
}

// Check if localStorage is available
const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

interface UsePlanStateReturn {
  currentPlan: Plan | null;
  codeContext: string;
  setCurrentPlan: (plan: Plan | null) => void;
  setCodeContext: (context: string) => void;
  clearState: () => void;
  saveState: () => void;
  loadState: () => void;
  isStorageAvailable: boolean;
  hasPersistedState: boolean;
}

export const usePlanState = (): UsePlanStateReturn => {
  const [currentPlan, setCurrentPlanState] = useState<Plan | null>(null);
  const [codeContext, setCodeContextState] = useState<string>('');
  const [isStorageAvailable] = useState<boolean>(isLocalStorageAvailable());
  const [hasPersistedState, setHasPersistedState] = useState<boolean>(false);

  // Load state from localStorage on mount
  useEffect(() => {
    loadState();
  }, []);

  // Auto-save state when it changes (only if storage is available)
  useEffect(() => {
    if (isStorageAvailable && (currentPlan || codeContext)) {
      saveState();
    }
  }, [currentPlan, codeContext, isStorageAvailable]);

  const saveState = useCallback(() => {
    if (!isStorageAvailable) return;
    
    try {
      const state: PlanState = {
        version: STORAGE_VERSION,
        currentPlan,
        codeContext,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setHasPersistedState(true);
    } catch (error) {
      console.warn('Failed to save state to localStorage:', error);
      setHasPersistedState(false);
    }
  }, [currentPlan, codeContext, isStorageAvailable]);

  const loadState = useCallback(() => {
    if (!isStorageAvailable) return;
    
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const state: PlanState = JSON.parse(savedState);
        
        // Check version compatibility
        if (state.version !== STORAGE_VERSION) {
          console.warn('Storage version mismatch, clearing old state');
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        
        // Only load if the state is recent (within 24 hours)
        const isRecent = Date.now() - state.lastUpdated < 24 * 60 * 60 * 1000;
        
        if (isRecent && state.currentPlan) {
          setCurrentPlanState(state.currentPlan);
          setCodeContextState(state.codeContext || '');
          setHasPersistedState(true);
        } else if (!isRecent) {
          // Clean up old state
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn('Failed to load state from localStorage:', error);
      // Try to clear corrupted state
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore cleanup errors
      }
    }
  }, [isStorageAvailable]);

  const clearState = useCallback(() => {
    setCurrentPlanState(null);
    setCodeContextState('');
    setHasPersistedState(false);
    
    if (isStorageAvailable) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear localStorage:', error);
      }
    }
  }, [isStorageAvailable]);

  const setCurrentPlan = useCallback((plan: Plan | null) => {
    setCurrentPlanState(plan);
  }, []);

  const setCodeContext = useCallback((context: string) => {
    setCodeContextState(context);
  }, []);

  return {
    currentPlan,
    codeContext,
    setCurrentPlan,
    setCodeContext,
    clearState,
    saveState,
    loadState,
    isStorageAvailable,
    hasPersistedState,
  };
};