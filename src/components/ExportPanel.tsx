'use client';

import React, { useState, useMemo } from 'react';
import { Plan, Step, StepExecution } from '@/types';
import { 
  exportAcceptedChanges, 
  generateCombinedPatch, 
  EXPORT_FORMATS,
  ExportOptions,
  AcceptedStep 
} from '@/utils/export';

interface ExportPanelProps {
  plan: Plan;
  stepExecutions: Map<string, StepExecution>;
  acceptedSteps: Set<string>;
  className?: string;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  plan,
  stepExecutions,
  acceptedSteps,
  className = ""
}) => {
  const [exportFormat, setExportFormat] = useState<'unified_diff' | 'git_patch' | 'combined'>('unified_diff');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Calculate accepted steps data
  const acceptedStepsData = useMemo((): AcceptedStep[] => {
    return plan.steps.map(step => ({
      step,
      execution: stepExecutions.get(step.id)!,
      accepted: acceptedSteps.has(step.id)
    })).filter(item => item.execution && item.accepted);
  }, [plan.steps, stepExecutions, acceptedSteps]);

  // Generate preview content
  const previewContent = useMemo(() => {
    if (!showPreview || acceptedStepsData.length === 0) return '';
    
    const options: ExportOptions = {
      format: exportFormat,
      includeMetadata
    };
    
    return generateCombinedPatch(plan, acceptedStepsData, options);
  }, [plan, acceptedStepsData, exportFormat, includeMetadata, showPreview]);

  // Handle export
  const handleExport = async () => {
    if (acceptedStepsData.length === 0) return;
    
    setIsExporting(true);
    
    try {
      const options: ExportOptions = {
        format: exportFormat,
        includeMetadata
      };
      
      exportAcceptedChanges(plan, acceptedStepsData, options);
    } catch (error) {
      console.error('Export failed:', error);
      // Could show error toast here
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalSteps = plan.steps.length;
    const acceptedCount = acceptedStepsData.length;
    const totalLines = acceptedStepsData.reduce((sum, item) => {
      return sum + (item.execution.suggested_patch.diff.split('\n').length || 0);
    }, 0);
    
    return {
      totalSteps,
      acceptedCount,
      totalLines
    };
  }, [plan.steps.length, acceptedStepsData]);

  if (acceptedStepsData.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <div className="text-gray-400 mb-3">
          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 mb-1">No changes to export</h3>
        <p className="text-sm text-gray-600">Accept some step changes to enable export functionality.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Export Changes</h3>
            <p className="text-sm text-gray-600 mt-1">
              Download accepted changes as a patch file
            </p>
          </div>
          
          {/* Stats */}
          <div className="text-right">
            <div className="text-sm text-gray-600">
              {stats.acceptedCount} of {stats.totalSteps} steps accepted
            </div>
            <div className="text-xs text-gray-500">
              ~{stats.totalLines} lines of changes
            </div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="px-6 py-4 space-y-4">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Format
          </label>
          <div className="grid grid-cols-1 gap-2">
            {EXPORT_FORMATS.map((format) => (
              <label key={format.value} className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="exportFormat"
                  value={format.value}
                  checked={exportFormat === format.value}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{format.label}</div>
                  <div className="text-xs text-gray-600">{format.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Options */}
        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Include metadata and step information</span>
          </label>
        </div>

        {/* Preview Toggle */}
        <div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="border-t border-gray-200">
          <div className="px-6 py-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Preview</h4>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 max-h-64 overflow-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                {previewContent}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Ready to export {stats.acceptedCount} accepted changes
          </div>
          
          <button
            onClick={handleExport}
            disabled={isExporting || acceptedStepsData.length === 0}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Patch
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;