/**
 * API utility functions for the Coding Agent Planner application
 */

import { Step, StepExecution, ExecuteStepRequest, GeneratePlanRequest, Plan } from '@/types';

/**
 * Execute a single step via the API
 */
export async function executeStep(step: Step, codeContext: string): Promise<StepExecution> {
  const request: ExecuteStepRequest = {
    step,
    codeContext
  };

  const response = await fetch('/api/execute-step', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded. Please try again in ${errorData.retryAfter || 60} seconds.`);
    }
    
    if (response.status === 400) {
      throw new Error(errorData.error || 'Invalid request data');
    }
    
    if (response.status === 500) {
      throw new Error(errorData.error || 'Server configuration error');
    }
    
    if (response.status === 502) {
      throw new Error(errorData.error || 'AI service error');
    }
    
    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Unknown error'}`);
  }

  const result: StepExecution = await response.json();
  return result;
}

/**
 * Generate a plan via the API
 */
export async function generatePlan(codeContext: string, intent: string): Promise<Plan> {
  const request: GeneratePlanRequest = {
    codeContext,
    intent
  };

  const response = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded. Please try again in ${errorData.retryAfter || 60} seconds.`);
    }
    
    if (response.status === 400) {
      throw new Error(errorData.error || 'Invalid request data');
    }
    
    if (response.status === 500) {
      throw new Error(errorData.error || 'Server configuration error');
    }
    
    if (response.status === 502) {
      throw new Error(errorData.error || 'AI service error');
    }
    
    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Unknown error'}`);
  }

  const result: Plan = await response.json();
  return result;
}

/**
 * Error types for API operations
 */
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class RateLimitError extends APIError {
  constructor(
    message: string,
    public retryAfter: number
  ) {
    super(message, 429, 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ServiceError extends APIError {
  constructor(message: string) {
    super(message, 502, 'SERVICE_ERROR');
    this.name = 'ServiceError';
  }
}