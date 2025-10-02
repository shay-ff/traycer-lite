'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// Note: modifiers can be added later if needed
// import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';

import { Plan, Step, StepExecution } from '@/types';
import { StepCard } from './StepCard';
import { ExportPanel } from './ExportPanel';
// Import will be added after SortableStepCard is created
// import { SortableStepCard } from './SortableStepCard';

interface PlanEditorProps {
  plan: Plan;
  onPlanChange: (plan: Plan) => void;
  onExecuteStep: (stepId: string) => void;
  onAcceptPatch?: (stepId: string) => void;
  onCopyPatch?: (stepId: string) => void;
  onRegenerateStep?: (stepId: string) => void;
  stepExecutions?: Map<string, StepExecution>;
  executingSteps?: Set<string>;
  acceptedSteps?: Set<string>;
  className?: string;
}

export const PlanEditor: React.FC<PlanEditorProps> = ({
  plan,
  onPlanChange,
  onExecuteStep,
  onAcceptPatch,
  onCopyPatch,
  onRegenerateStep,
  stepExecutions = new Map(),
  executingSteps = new Set(),
  acceptedSteps = new Set(),
  className = ""
}) => {
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle step editing
  const handleStepEdit = useCallback((editedStep: Step) => {
    const updatedSteps = plan.steps.map(step => 
      step.id === editedStep.id ? editedStep : step
    );
    
    onPlanChange({
      ...plan,
      steps: updatedSteps
    });
  }, [plan, onPlanChange]);

  // Handle step deletion
  const handleStepDelete = useCallback((stepId: string) => {
    const updatedSteps = plan.steps.filter(step => step.id !== stepId);
    
    onPlanChange({
      ...plan,
      steps: updatedSteps
    });
  }, [plan, onPlanChange]);

  // Handle adding new step
  const handleAddStep = useCallback(() => {
    const newStepId = `s${plan.steps.length + 1}`;
    const newStep: Step = {
      id: newStepId,
      title: 'New Step',
      description: 'Describe what this step should do...',
      output: {
        type: 'patch',
        patch_format: 'unified_diff'
      }
    };

    onPlanChange({
      ...plan,
      steps: [...plan.steps, newStep]
    });
  }, [plan, onPlanChange]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedStepId(null);

    if (over && active.id !== over.id) {
      const oldIndex = plan.steps.findIndex(step => step.id === active.id);
      const newIndex = plan.steps.findIndex(step => step.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedSteps = arrayMove(plan.steps, oldIndex, newIndex);
        
        onPlanChange({
          ...plan,
          steps: reorderedSteps
        });
      }
    }
  }, [plan, onPlanChange]);

  // Handle drag start
  const handleDragStart = useCallback((event: any) => {
    setDraggedStepId(event.active.id);
  }, []);

  // Get step IDs for sortable context
  const stepIds = useMemo(() => plan.steps.map(step => step.id), [plan.steps]);

  // Calculate execution progress
  const executionProgress = useMemo(() => {
    const acceptedStepsCount = plan.steps.filter(step => acceptedSteps.has(step.id)).length;
    const totalSteps = plan.steps.length;
    return totalSteps > 0 ? (acceptedStepsCount / totalSteps) * 100 : 0;
  }, [plan.steps, acceptedSteps]);

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Plan Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Implementation Plan
            </h2>
            <p className="text-gray-600 mb-3">{plan.task}</p>
            
            {/* Plan Metadata */}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {plan.language && (
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                  {plan.language}
                </span>
              )}
              {plan.file && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-md font-mono">
                  {plan.file}
                </span>
              )}
              <span>{plan.steps.length} steps</span>
            </div>
          </div>

          {/* Add Step Button */}
          <button
            onClick={handleAddStep}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200"
          >
            + Add Step
          </button>
        </div>

        {/* Progress Bar */}
        {plan.steps.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(executionProgress)}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${executionProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Steps List */}
      {plan.steps.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No steps in plan</h3>
          <p className="text-gray-600 mb-4">Add steps to start building your implementation plan.</p>
          <button
            onClick={handleAddStep}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200"
          >
            Add First Step
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          // modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {plan.steps.map((step, index) => {
                const {
                  attributes,
                  listeners,
                  setNodeRef,
                  transform,
                  transition,
                  isDragging: isSortableDragging,
                } = useSortable({ id: step.id });

                const style = {
                  transform: CSS.Transform.toString(transform),
                  transition,
                  opacity: isSortableDragging ? 0.5 : 1,
                };

                return (
                  <div
                    key={step.id}
                    ref={setNodeRef}
                    style={style}
                    className={`
                      relative
                      ${isSortableDragging ? 'z-50' : ''}
                      ${draggedStepId === step.id ? 'shadow-lg' : ''}
                    `}
                  >
                    {/* Step Number Badge */}
                    <div className="absolute -left-3 top-4 z-10">
                      <div className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                        {index + 1}
                      </div>
                    </div>

                    {/* Drag Handle Overlay */}
                    <div
                      {...attributes}
                      {...listeners}
                      className="absolute right-4 bottom-2 z-10 p-2 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded transition-colors duration-200"
                      title="Drag to reorder"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </div>

                    {/* Step Card */}
                    <StepCard
                      step={step}
                      onEdit={handleStepEdit}
                      onDelete={handleStepDelete}
                      onExecute={onExecuteStep}
                      onAcceptPatch={onAcceptPatch}
                      onCopyPatch={onCopyPatch}
                      onRegenerateStep={onRegenerateStep}
                      executionResult={stepExecutions.get(step.id)}
                      isExecuting={executingSteps.has(step.id)}
                      isAccepted={acceptedSteps.has(step.id)}
                      className="ml-3"
                    />
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Plan Actions */}
      {plan.steps.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {acceptedSteps.size} of {plan.steps.length} steps accepted
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  const nextStep = plan.steps.find(step => !acceptedSteps.has(step.id) && !executingSteps.has(step.id));
                  if (nextStep) {
                    onExecuteStep(nextStep.id);
                  }
                }}
                disabled={executingSteps.size > 0 || acceptedSteps.size === plan.steps.length}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {acceptedSteps.size === plan.steps.length ? 'All Steps Complete' : 'Run Next Step'}
              </button>
              
              <button
                onClick={() => {
                  plan.steps.forEach(step => {
                    if (!acceptedSteps.has(step.id) && !executingSteps.has(step.id)) {
                      onExecuteStep(step.id);
                    }
                  });
                }}
                disabled={executingSteps.size > 0 || acceptedSteps.size === plan.steps.length}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Run All Steps
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Panel */}
      {acceptedSteps.size > 0 && (
        <ExportPanel
          plan={plan}
          stepExecutions={stepExecutions}
          acceptedSteps={acceptedSteps}
          className="mt-6"
        />
      )}

      {/* Tips */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Plan Editing Tips:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Click on step titles or descriptions to edit them inline</li>
          <li>• Drag steps by their handles to reorder the execution sequence</li>
          <li>• Use "Run Next Step" to execute steps one by one for better control</li>
          <li>• Add new steps to extend your implementation plan</li>
          <li>• Export accepted changes as patch files for easy application</li>
        </ul>
      </div>
    </div>
  );
};

export default PlanEditor;