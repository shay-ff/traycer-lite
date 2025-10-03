"use client";

import React, { useCallback } from "react";
import { Plan } from "@/types";
import { IntentForm, PlanEditor } from "@/components";
import { useAppState } from "@/hooks";
import { generatePlan } from "@/utils/api";

export default function Home() {
  // Application state management
  const {
    currentPlan,
    codeContext,
    setCurrentPlan,
    setCodeContext,
    isGeneratingPlan,
    setIsGeneratingPlan,
    error,
    setError,
    clearError,
    stepExecutions,
    executingSteps,
    acceptedSteps,
    executeStepById,
    acceptPatch,
    copyPatch,
    regenerateStep,
    clearAllExecutions,
    startOver,
  } = useAppState();

  // Handle plan generation
  const handleGeneratePlan = useCallback(
    async (data: { codeContext: string; intent: string }) => {
      setIsGeneratingPlan(true);
      setError(null);
      clearAllExecutions();

      // Update the code context from the form data
      setCodeContext(data.codeContext);

      try {
        const plan = await generatePlan(data.codeContext, data.intent);
        setCurrentPlan(plan);
        clearError(); // Clear any previous errors on success
      } catch (err) {
        console.error("Failed to generate plan:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to generate plan";
        setError(errorMessage, "api");
      } finally {
        setIsGeneratingPlan(false);
      }
    },
    [
      setIsGeneratingPlan,
      setError,
      clearAllExecutions,
      setCodeContext,
      setCurrentPlan,
      clearError,
    ]
  );

  // Handle step execution
  const handleExecuteStep = useCallback(
    async (stepId: string) => {
      if (!currentPlan) {
        setError("Missing plan", "validation");
        return;
      }

      const step = currentPlan.steps.find((s) => s.id === stepId);
      if (!step) {
        setError(`Step ${stepId} not found`, "validation");
        return;
      }

      clearError();
      await executeStepById(stepId, step, codeContext);
    },
    [currentPlan, codeContext, executeStepById, setError, clearError]
  );

  // Handle patch acceptance
  const handleAcceptPatch = useCallback(
    (stepId: string) => {
      acceptPatch(stepId);
    },
    [acceptPatch]
  );

  // Handle patch copying
  const handleCopyPatch = useCallback(
    (stepId: string) => {
      copyPatch(stepId);
    },
    [copyPatch]
  );

  // Handle step regeneration
  const handleRegenerateStep = useCallback(
    async (stepId: string) => {
      if (!currentPlan) {
        setError("Missing plan", "validation");
        return;
      }

      const step = currentPlan.steps.find((s) => s.id === stepId);
      if (!step) {
        setError(`Step ${stepId} not found`, "validation");
        return;
      }

      clearError();
      await regenerateStep(stepId, step, codeContext);
    },
    [currentPlan, codeContext, regenerateStep, setError, clearError]
  );

  // Handle plan changes
  const handlePlanChange = useCallback(
    (updatedPlan: Plan) => {
      setCurrentPlan(updatedPlan);
    },
    [setCurrentPlan]
  );

  // Handle starting over (using the centralized startOver function)
  const handleStartOver = useCallback(() => {
    startOver();
  }, [startOver]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-gray-900 hidden sm:block">
                  Coding Agent Planner
                </h1>
                <h1 className="text-lg font-semibold text-gray-900 sm:hidden">
                  Planner
                </h1>
              </div>

              {/* Plan Status Indicator */}
              {currentPlan && (
                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Plan Active</span>
                  <span className="text-gray-400">•</span>
                  <span>{currentPlan.steps.length} steps</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {currentPlan && (
                <>
                  {/* Mobile Plan Info */}
                  <div className="md:hidden text-sm text-gray-600">
                    {currentPlan.steps.length} steps
                  </div>

                  <button
                    onClick={handleStartOver}
                    className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200"
                  >
                    <span className="hidden sm:inline">Start Over</span>
                    <span className="sm:hidden">Reset</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <span className="text-red-800 font-medium block">Error:</span>
                <span className="text-red-700 break-words">
                  {error.message}
                </span>
                {error.type !== "unknown" && (
                  <span className="text-red-600 text-xs block mt-1 capitalize">
                    {error.type} error
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {!currentPlan ? (
          /* Plan Generation Interface */
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center px-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Create Your Implementation Plan
              </h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                Provide your code context and describe what you want to
                implement. The AI will generate a detailed step-by-step plan for
                you.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <IntentForm
                onSubmit={handleGeneratePlan}
                loading={isGeneratingPlan}
                error={error?.message || null}
              />
            </div>

            {/* Tips */}
            <div className="max-w-4xl mx-auto mt-6 sm:mt-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-medium text-blue-900 mb-3">
                  💡 Tips for Better Plans:
                </h3>
                <ul className="text-sm sm:text-base text-blue-800 space-y-1 sm:space-y-2">
                  <li>
                    • Include relevant existing code, file structures, or
                    configuration files
                  </li>
                  <li>
                    • Be specific about what you want to implement or change
                  </li>
                  <li>
                    • Mention any constraints, preferences, or requirements
                  </li>
                  <li>
                    • Include error messages or issues you&apos;re trying to solve
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          /* Plan Execution Interface */
          <PlanEditor
            plan={currentPlan}
            onPlanChange={handlePlanChange}
            onExecuteStep={handleExecuteStep}
            onAcceptPatch={handleAcceptPatch}
            onCopyPatch={handleCopyPatch}
            onRegenerateStep={handleRegenerateStep}
            stepExecutions={stepExecutions}
            executingSteps={executingSteps}
            acceptedSteps={acceptedSteps}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              Coding Agent Planner - AI-powered implementation planning
            </p>
            <div className="mt-2 flex items-center justify-center space-x-4 text-xs text-gray-400">
              <span>Powered by Groq</span>
              <span>•</span>
              <span>Built with Next.js</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
