'use client';

import React, { useState, useCallback } from 'react';
import { Step, StepExecution } from '@/types';
import { DiffViewer } from './DiffViewer';

interface StepCardProps {
  step: Step;
  onEdit: (step: Step) => void;
  onDelete: (stepId: string) => void;
  onExecute: (stepId: string) => void;
  onAcceptPatch?: (stepId: string) => void;
  onCopyPatch?: (stepId: string) => void;
  onRegenerateStep?: (stepId: string) => void;
  executionResult?: StepExecution;
  isExecuting?: boolean;
  isAccepted?: boolean;
  className?: string;
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  onEdit,
  onDelete,
  onExecute,
  onAcceptPatch,
  onCopyPatch,
  onRegenerateStep,
  executionResult,
  isExecuting = false,
  isAccepted = false,
  className = ""
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState(step.title);
  const [editedDescription, setEditedDescription] = useState(step.description);

  // Handle title editing
  const handleTitleEdit = useCallback(() => {
    setIsEditingTitle(true);
    setEditedTitle(step.title);
  }, [step.title]);

  const handleTitleSave = useCallback(() => {
    if (editedTitle.trim() && editedTitle !== step.title) {
      onEdit({
        ...step,
        title: editedTitle.trim()
      });
    }
    setIsEditingTitle(false);
  }, [editedTitle, step, onEdit]);

  const handleTitleCancel = useCallback(() => {
    setEditedTitle(step.title);
    setIsEditingTitle(false);
  }, [step.title]);

  // Handle description editing
  const handleDescriptionEdit = useCallback(() => {
    setIsEditingDescription(true);
    setEditedDescription(step.description);
  }, [step.description]);

  const handleDescriptionSave = useCallback(() => {
    if (editedDescription.trim() && editedDescription !== step.description) {
      onEdit({
        ...step,
        description: editedDescription.trim()
      });
    }
    setIsEditingDescription(false);
  }, [editedDescription, step, onEdit]);

  const handleDescriptionCancel = useCallback(() => {
    setEditedDescription(step.description);
    setIsEditingDescription(false);
  }, [step.description]);

  // Handle keyboard events for editing
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  }, [handleTitleSave, handleTitleCancel]);

  const handleDescriptionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleDescriptionSave();
    } else if (e.key === 'Escape') {
      handleDescriptionCancel();
    }
  }, [handleDescriptionSave, handleDescriptionCancel]);

  // Handle step execution
  const handleExecuteClick = useCallback(() => {
    if (!isExecuting) {
      onExecute(step.id);
    }
  }, [step.id, onExecute, isExecuting]);

  // Handle step deletion
  const handleDeleteClick = useCallback(() => {
    if (window.confirm(`Are you sure you want to delete step "${step.title}"?`)) {
      onDelete(step.id);
    }
  }, [step.id, step.title, onDelete]);

  // Get execution status
  const getExecutionStatus = () => {
    if (isExecuting) return 'executing';
    if (isAccepted) return 'accepted';
    if (executionResult) return 'completed';
    return 'pending';
  };

  const executionStatus = getExecutionStatus();

  // Handle patch actions
  const handleAcceptPatch = useCallback(() => {
    if (onAcceptPatch) {
      onAcceptPatch(step.id);
    }
  }, [step.id, onAcceptPatch]);

  const handleCopyPatch = useCallback(() => {
    if (onCopyPatch) {
      onCopyPatch(step.id);
    }
  }, [step.id, onCopyPatch]);

  const handleRegenerateStep = useCallback(() => {
    if (onRegenerateStep) {
      onRegenerateStep(step.id);
    }
  }, [step.id, onRegenerateStep]);

  return (
    <div className={`
      bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200
      ${executionStatus === 'executing' ? 'border-blue-300 bg-blue-50' : ''}
      ${executionStatus === 'completed' ? 'border-green-300 bg-green-50' : ''}
      ${executionStatus === 'accepted' ? 'border-emerald-300 bg-emerald-50' : ''}
      ${className}
    `}>
      {/* Card Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Step ID Badge */}
            <div className="flex items-center mb-2">
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md">
                {step.id}
              </span>
              {step.output?.type && (
                <span className={`
                  ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-md
                  ${step.output.type === 'patch' ? 'bg-blue-100 text-blue-700' : ''}
                  ${step.output.type === 'instruction' ? 'bg-yellow-100 text-yellow-700' : ''}
                  ${step.output.type === 'file_replace' ? 'bg-purple-100 text-purple-700' : ''}
                `}>
                  {step.output.type}
                </span>
              )}
              {/* Execution Status */}
              <div className="ml-auto flex items-center">
                {executionStatus === 'executing' && (
                  <div className="flex items-center text-blue-600">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm">Running...</span>
                  </div>
                )}
                {executionStatus === 'completed' && (
                  <div className="flex items-center text-green-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Completed</span>
                  </div>
                )}
                {executionStatus === 'accepted' && (
                  <div className="flex items-center text-emerald-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Accepted</span>
                  </div>
                )}
              </div>
            </div>

            {/* Title - Editable */}
            {isEditingTitle ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="w-full text-lg font-semibold text-gray-900 bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
            ) : (
              <h3 
                className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors duration-200"
                onClick={handleTitleEdit}
                title="Click to edit title"
              >
                {step.title}
              </h3>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handleExecuteClick}
              disabled={isExecuting}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200
                ${isExecuting 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
                }
              `}
              title={isExecuting ? 'Step is running...' : 'Execute this step'}
            >
              {isExecuting ? 'Running...' : 'Run Step'}
            </button>
            
            <button
              onClick={handleDeleteClick}
              disabled={isExecuting}
              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors duration-200 disabled:opacity-50"
              title="Delete step"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6.5l1.5 1.5A1 1 0 0117 14v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a1 1 0 01.5-1.5L5 11.5V5zM6 5v6a1 1 0 00.293.707L8 13.414V17h4v-3.586l1.707-1.707A1 1 0 0014 11V5H6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Description - Editable */}
        {isEditingDescription ? (
          <div>
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={handleDescriptionSave}
              onKeyDown={handleDescriptionKeyDown}
              className="w-full text-gray-700 bg-white border border-blue-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-vertical"
              rows={3}
              autoFocus
            />
            <div className="mt-2 text-sm text-gray-500">
              Press Ctrl+Enter to save, Escape to cancel
            </div>
          </div>
        ) : (
          <p 
            className="text-gray-700 cursor-pointer hover:text-blue-600 transition-colors duration-200 whitespace-pre-wrap"
            onClick={handleDescriptionEdit}
            title="Click to edit description"
          >
            {step.description}
          </p>
        )}

        {/* Input Files */}
        {step.input_files && step.input_files.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Input Files:</h4>
            <div className="flex flex-wrap gap-1">
              {step.input_files.map((file, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2 py-1 text-xs font-mono bg-gray-100 text-gray-700 rounded"
                >
                  {file}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Execution Result with DiffViewer */}
        {executionResult && (
          <div className="mt-4">
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Execution Result:</h4>
              <p className="text-sm text-blue-700">{executionResult.explanation}</p>
            </div>
            
            <DiffViewer
              diff={executionResult.suggested_patch.diff}
              format={executionResult.suggested_patch.format}
              language={step.output?.patch_format === 'unified_diff' ? 'diff' : undefined}
              onAccept={handleAcceptPatch}
              onCopy={handleCopyPatch}
              onRegenerate={handleRegenerateStep}
              className="border-0 shadow-none"
            />
          </div>
        )}
      </div>

      {/* Drag Handle */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
          <span className="ml-2 text-xs text-gray-500">Drag to reorder</span>
        </div>
      </div>
    </div>
  );
};

export default StepCard;