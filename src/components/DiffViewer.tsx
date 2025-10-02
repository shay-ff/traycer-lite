'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useToastHelpers } from './Toast';
import { ButtonLoader } from './LoadingIndicator';

interface DiffViewerProps {
  diff: string;
  format: 'unified_diff' | 'full_file';
  language?: string;
  onAccept: () => void;
  onCopy: () => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
  className?: string;
}

interface DiffLine {
  type: 'context' | 'addition' | 'deletion' | 'header' | 'hunk';
  content: string;
  lineNumber?: {
    old?: number;
    new?: number;
  };
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diff,
  format,
  language,
  onAccept,
  onCopy,
  onRegenerate,
  isRegenerating = false,
  className = ""
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const { success: showSuccess, error: showError } = useToastHelpers();

  // Parse unified diff into structured lines
  const parsedDiff = useMemo(() => {
    if (format === 'full_file') {
      // For full file replacement, treat each line as context
      return diff.split('\n').map((line, index) => ({
        type: 'context' as const,
        content: line,
        lineNumber: { new: index + 1 }
      }));
    }

    // Parse unified diff format
    const lines = diff.split('\n');
    const parsed: DiffLine[] = [];
    let oldLineNum = 0;
    let newLineNum = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          oldLineNum = parseInt(match[1], 10);
          newLineNum = parseInt(match[2], 10);
        }
        parsed.push({
          type: 'hunk',
          content: line
        });
      } else if (line.startsWith('---') || line.startsWith('+++')) {
        // File headers
        parsed.push({
          type: 'header',
          content: line
        });
      } else if (line.startsWith('+')) {
        // Addition
        parsed.push({
          type: 'addition',
          content: line.substring(1),
          lineNumber: { new: newLineNum }
        });
        newLineNum++;
      } else if (line.startsWith('-')) {
        // Deletion
        parsed.push({
          type: 'deletion',
          content: line.substring(1),
          lineNumber: { old: oldLineNum }
        });
        oldLineNum++;
      } else if (line.startsWith(' ') || line === '') {
        // Context line
        parsed.push({
          type: 'context',
          content: line.startsWith(' ') ? line.substring(1) : line,
          lineNumber: { old: oldLineNum, new: newLineNum }
        });
        oldLineNum++;
        newLineNum++;
      } else {
        // Treat unknown lines as context
        parsed.push({
          type: 'context',
          content: line,
          lineNumber: { old: oldLineNum, new: newLineNum }
        });
        oldLineNum++;
        newLineNum++;
      }
    }

    return parsed;
  }, [diff, format]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      const { copyPatch } = await import('../utils/clipboard');
      
      await copyPatch(
        diff,
        () => {
          setCopySuccess(true);
          onCopy();
          showSuccess('Copied to clipboard', 'The patch has been copied successfully');
          setTimeout(() => setCopySuccess(false), 2000);
        },
        (error) => {
          console.error('Failed to copy to clipboard:', error);
          showError('Copy failed', 'Unable to copy to clipboard. Please try again.');
        }
      );
    } catch (error) {
      showError('Copy failed', 'An error occurred while copying to clipboard');
    }
  }, [diff, onCopy, showSuccess, showError]);

  // Handle accept patch
  const handleAccept = useCallback(() => {
    try {
      onAccept();
      showSuccess('Patch accepted', 'The changes have been accepted');
    } catch (error) {
      showError('Accept failed', 'Unable to accept the patch. Please try again.');
    }
  }, [onAccept, showSuccess, showError]);

  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    try {
      onRegenerate();
      showSuccess('Regenerating step', 'The step is being regenerated...');
    } catch (error) {
      showError('Regenerate failed', 'Unable to regenerate the step. Please try again.');
    }
  }, [onRegenerate, showSuccess, showError]);

  // Get line styling based on type
  const getLineClassName = (line: DiffLine) => {
    const baseClasses = "font-mono text-sm leading-relaxed px-4 py-1 whitespace-pre-wrap";
    
    switch (line.type) {
      case 'addition':
        return `${baseClasses} bg-green-50 text-green-800 border-l-4 border-green-400`;
      case 'deletion':
        return `${baseClasses} bg-red-50 text-red-800 border-l-4 border-red-400`;
      case 'context':
        return `${baseClasses} bg-white text-gray-700`;
      case 'header':
        return `${baseClasses} bg-gray-100 text-gray-600 font-semibold`;
      case 'hunk':
        return `${baseClasses} bg-blue-50 text-blue-700 font-medium`;
      default:
        return baseClasses;
    }
  };

  // Get line number display
  const getLineNumbers = (line: DiffLine) => {
    if (format === 'full_file') {
      return line.lineNumber?.new?.toString().padStart(4, ' ') || '';
    }

    const oldNum = line.lineNumber?.old?.toString().padStart(4, ' ') || '    ';
    const newNum = line.lineNumber?.new?.toString().padStart(4, ' ') || '    ';
    
    switch (line.type) {
      case 'addition':
        return `    ${newNum}`;
      case 'deletion':
        return `${oldNum}    `;
      case 'context':
        return `${oldNum}${newNum}`;
      default:
        return '        ';
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header with action buttons */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {format === 'unified_diff' ? 'Code Changes' : 'File Content'}
          </h3>
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-md">
            {format === 'unified_diff' ? 'Unified Diff' : 'Full File'}
          </span>
          {language && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md">
              {language}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200"
            title="Copy to clipboard"
          >
            {copySuccess ? (
              <>
                <svg className="w-4 h-4 mr-1.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>

          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Regenerate this step"
          >
            {isRegenerating ? (
              <ButtonLoader text="Regenerating..." />
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate
              </>
            )}
          </button>

          <button
            onClick={handleAccept}
            className="inline-flex items-center px-4 py-1.5 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-colors duration-200"
            title="Accept these changes"
          >
            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Accept Patch
          </button>
        </div>
      </div>

      {/* Diff content */}
      <div className="overflow-auto max-h-96">
        {parsedDiff.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">No changes to display</p>
            <p className="text-sm">The diff appears to be empty or invalid.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {parsedDiff.map((line, index) => (
              <div key={index} className="flex">
                {/* Line numbers */}
                <div className="flex-shrink-0 w-20 px-2 py-1 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 font-mono text-right select-none">
                  {getLineNumbers(line)}
                </div>
                
                {/* Line content */}
                <div className={`flex-1 ${getLineClassName(line)}`}>
                  {line.content || '\u00A0'} {/* Non-breaking space for empty lines */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>{parsedDiff.length} lines</span>
            {format === 'unified_diff' && (
              <>
                <span className="text-green-600">
                  +{parsedDiff.filter(line => line.type === 'addition').length} additions
                </span>
                <span className="text-red-600">
                  -{parsedDiff.filter(line => line.type === 'deletion').length} deletions
                </span>
              </>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {diff.length} characters
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiffViewer;