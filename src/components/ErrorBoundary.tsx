"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <svg
                className="w-6 h-6 text-red-600 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <h3 className="text-lg font-semibold text-red-800">
                Something went wrong
              </h3>
            </div>

            <p className="text-red-700 mb-4">
              An unexpected error occurred while rendering this component.
              Please try again.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mb-4">
                <summary className="text-sm font-medium text-red-800 cursor-pointer hover:text-red-900">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-red-100 rounded text-xs font-mono text-red-800 overflow-auto max-h-32">
                  <div className="font-semibold mb-1">Error:</div>
                  <div className="mb-2">{this.state.error.message}</div>
                  {this.state.error.stack && (
                    <>
                      <div className="font-semibold mb-1">Stack Trace:</div>
                      <pre className="whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="flex space-x-3">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors duration-200"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors duration-200"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for API operations
interface APIErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

export const APIErrorBoundary: React.FC<APIErrorBoundaryProps> = ({
  children,
  onRetry,
}) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-[150px] flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg
                className="w-5 h-5 text-amber-600 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <h3 className="text-sm font-semibold text-amber-800">
                API Error
              </h3>
            </div>

            <p className="text-amber-700 text-sm mb-3">
              Failed to communicate with the service. This might be a temporary
              issue.
            </p>

            <div className="flex space-x-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 border border-transparent rounded hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors duration-200"
                >
                  Retry
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors duration-200"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;
