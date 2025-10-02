/**
 * Core data models for the Coding Agent Planner application
 */

export interface Plan {
  task: string;
  language?: string;
  file?: string;
  steps: Step[];
}

export interface Step {
  id: string;
  title: string;
  description: string;
  input_files?: string[];
  output?: {
    type: "instruction" | "patch" | "file_replace";
    patch_format?: string;
  };
}

export interface StepExecution {
  step_id: string;
  suggested_patch: {
    format: "unified_diff" | "full_file";
    diff: string;
  };
  explanation: string;
}

// API request/response types
export interface GeneratePlanRequest {
  codeContext: string;
  intent: string;
}

export interface ExecuteStepRequest {
  step: Step;
  codeContext: string;
}

// Application state types
export interface AppState {
  currentPlan: Plan | null;
  stepExecutions: Map<string, StepExecution>;
  loading: boolean;
  error: string | null;
}

// Groq API configuration
export interface GroqConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}