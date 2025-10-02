"use client";

import React, { useState, useCallback } from "react";
import { Plan, Step } from "@/types";
import { IntentForm, PlanEditor } from "@/components";
import { useStepExecution } from "@/hooks";
import { generatePlan } from "@/utils/api";

export default function Home() {
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [codeContext, setCodeContext] = useState("");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step execution management
  const {
    stepExecutions,
    executingSteps,
    acceptedSteps,
    executeStepById,
    acceptPatch,
    copyPatch,
    regenerateStep,
    clearAllExecutions,
  } = useStepExecution();

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
      } catch (err) {
        console.error("Failed to generate plan:", err);
        setError(
          err instanceof Error ? err.message : "Failed to generate plan"
        );
      } finally {
        setIsGeneratingPlan(false);
      }
    },
    [clearAllExecutions]
  );

  // Handle step execution
  const handleExecuteStep = useCallback(
    async (stepId: string) => {
      if (!currentPlan || !codeContext.trim()) {
        setError("Missing plan or code context");
        return;
      }

      const step = currentPlan.steps.find((s) => s.id === stepId);
      if (!step) {
        setError(`Step ${stepId} not found`);
        return;
      }

      setError(null);
      await executeStepById(stepId, step, codeContext);
    },
    [currentPlan, codeContext, executeStepById]
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
      if (!currentPlan || !codeContext.trim()) {
        setError("Missing plan or code context");
        return;
      }

      const step = currentPlan.steps.find((s) => s.id === stepId);
      if (!step) {
        setError(`Step ${stepId} not found`);
        return;
      }

      setError(null);
      await regenerateStep(stepId, step, codeContext);
    },
    [currentPlan, codeContext, regenerateStep]
  );

  // Handle plan changes
  const handlePlanChange = useCallback((updatedPlan: Plan) => {
    setCurrentPlan(updatedPlan);
  }, []);

  // Handle starting over
  const handleStartOver = useCallback(() => {
    setCurrentPlan(null);
    setCodeContext("");
    setError(null);
    clearAllExecutions();
  }, [clearAllExecutions]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Coding Agent Planner
              </h1>
            </div>

            {currentPlan && (
              <button
                onClick={handleStartOver}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200"
              >
                Start Over
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-400 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-red-800 font-medium">Error:</span>
              <span className="text-red-700 ml-1">{error}</span>
            </div>
          </div>
        )}

        {!currentPlan ? (
          /* Plan Generation Interface */
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Create Your Implementation Plan
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Provide your code context and describe what you want to
                implement. The AI will generate a detailed step-by-step plan for
                you.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <IntentForm
                onSubmit={handleGeneratePlan}
                loading={isGeneratingPlan}
                error={error}
              />
            </div>

            {/* Tips */}
            <div className="max-w-4xl mx-auto mt-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-900 mb-3">
                  💡 Tips for Better Plans:
                </h3>
                <ul className="text-blue-800 space-y-2">
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
                    • Include error messages or issues you're trying to solve
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
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p>Coding Agent Planner - AI-powered implementation planning</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
