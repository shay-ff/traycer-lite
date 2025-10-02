/**
 * API utility functions for the Coding Agent Planner application
 */

import {
  Step,
  StepExecution,
  ExecuteStepRequest,
  GeneratePlanRequest,
  Plan,
} from "@/types";

/**
 * Error types for API operations
 */
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class RateLimitError extends APIError {
  constructor(message: string, public retryAfter: number) {
    super(message, 429, "RATE_LIMIT", true);
    this.name = "RateLimitError";
  }
}

export class ValidationError extends APIError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR", false);
    this.name = "ValidationError";
  }
}

export class ServiceError extends APIError {
  constructor(message: string, retryable: boolean = true) {
    super(message, 502, "SERVICE_ERROR", retryable);
    this.name = "ServiceError";
  }
}

export class NetworkError extends APIError {
  constructor(message: string) {
    super(message, 0, "NETWORK_ERROR", true);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends APIError {
  constructor(message: string) {
    super(message, 408, "TIMEOUT_ERROR", true);
    this.name = "TimeoutError";
  }
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Sleep utility for delays
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay =
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * Enhanced fetch with timeout and error handling
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new TimeoutError(`Request timed out after ${timeoutMs}ms`);
      }
      if (error.message.includes("fetch")) {
        throw new NetworkError(`Network error: ${error.message}`);
      }
    }

    throw error;
  }
}

/**
 * Retry wrapper for API calls
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on non-retryable errors
      if (error instanceof APIError && !error.retryable) {
        throw error;
      }

      // Don't retry on validation errors
      if (error instanceof ValidationError) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === retryConfig.maxAttempts) {
        break;
      }

      // Calculate delay for exponential backoff
      const delay = calculateDelay(attempt, retryConfig);

      // Handle rate limiting with custom delay
      if (error instanceof RateLimitError) {
        const rateLimitDelay = error.retryAfter * 1000; // Convert to ms
        await sleep(Math.max(delay, rateLimitDelay));
      } else {
        await sleep(delay);
      }

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, lastError);
      }
    }
  }

  // This should never happen since we always assign lastError in the catch block,
  // but we add a fallback for type safety
  if (lastError === null) {
    throw new APIError(
      "Unknown error occurred during retry operation",
      500,
      "UNKNOWN_ERROR",
      false
    );
  }

  throw lastError;
}

/**
 * Parse API error response
 */
async function parseErrorResponse(response: Response): Promise<APIError> {
  let errorData: any = {};

  try {
    errorData = await response.json();
  } catch {
    // Ignore JSON parsing errors
  }

  const message =
    errorData.error || `HTTP ${response.status}: ${response.statusText}`;

  switch (response.status) {
    case 400:
      return new ValidationError(message);
    case 401:
      return new APIError(
        "Authentication failed. Please check your API configuration.",
        401,
        "AUTH_ERROR",
        false
      );
    case 403:
      return new APIError(
        "Access forbidden. Please check your permissions.",
        403,
        "FORBIDDEN_ERROR",
        false
      );
    case 404:
      return new APIError("Resource not found.", 404, "NOT_FOUND_ERROR", false);
    case 429:
      const retryAfter = parseInt(errorData.retryAfter || "60", 10);
      return new RateLimitError(message, retryAfter);
    case 500:
      return new APIError(message, 500, "SERVER_ERROR", true);
    case 502:
    case 503:
    case 504:
      return new ServiceError(message, true);
    default:
      return new APIError(
        message,
        response.status,
        "UNKNOWN_ERROR",
        response.status >= 500
      );
  }
}

/**
 * Execute a single step via the API with retry logic
 */
export async function executeStep(
  step: Step,
  codeContext: string,
  onRetry?: (attempt: number, error: Error) => void
): Promise<StepExecution> {
  const request: ExecuteStepRequest = {
    step,
    codeContext,
  };

  return withRetry(
    async () => {
      const response = await fetchWithTimeout("/api/execute-step", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw await parseErrorResponse(response);
      }

      const result: StepExecution = await response.json();
      return result;
    },
    {},
    onRetry
  );
}

/**
 * Generate a plan via the API with retry logic
 */
export async function generatePlan(
  codeContext: string,
  intent: string,
  onRetry?: (attempt: number, error: Error) => void
): Promise<Plan> {
  const request: GeneratePlanRequest = {
    codeContext,
    intent,
  };

  return withRetry(
    async () => {
      const response = await fetchWithTimeout("/api/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw await parseErrorResponse(response);
      }

      const result: Plan = await response.json();
      return result;
    },
    {},
    onRetry
  );
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof APIError) {
    return error.retryable;
  }

  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return true;
  }

  return false;
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: Error): string {
  if (error instanceof RateLimitError) {
    return `Rate limit exceeded. Please wait ${error.retryAfter} seconds before trying again.`;
  }

  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof NetworkError) {
    return "Network connection failed. Please check your internet connection and try again.";
  }

  if (error instanceof TimeoutError) {
    return "Request timed out. The service might be experiencing high load. Please try again.";
  }

  if (error instanceof ServiceError) {
    return "The AI service is temporarily unavailable. Please try again in a few moments.";
  }

  if (error instanceof APIError) {
    switch (error.code) {
      case "AUTH_ERROR":
        return "Authentication failed. Please check your API configuration.";
      case "FORBIDDEN_ERROR":
        return "Access denied. Please check your permissions.";
      case "NOT_FOUND_ERROR":
        return "The requested resource was not found.";
      case "SERVER_ERROR":
        return "Server error occurred. Please try again later.";
      default:
        return error.message;
    }
  }

  return error.message || "An unexpected error occurred. Please try again.";
}
