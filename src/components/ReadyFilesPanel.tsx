'use client';

import React, { useState, useMemo } from 'react';
import { ReconstructedFile } from '@/utils/fileReconstruction';
import { copyToClipboard } from '@/utils/clipboard';
import { useToastHelpers } from '@/components/Toast';

interface ReadyFilesPanelProps {
  reconstructedFiles: ReconstructedFile[];
  onDownloadFile?: (file: ReconstructedFile) => void;
  onDownloadAll?: (files: ReconstructedFile[]) => void;
}

export const ReadyFilesPanel: React.FC<ReadyFilesPanelProps> = ({
  reconstructedFiles,
  onDownloadFile,
  onDownloadAll,
}) => {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [selectedView, setSelectedView] = useState<'corrected' | 'diff'>('corrected');
  const { success: showSuccess, error: showError } = useToastHelpers();

  const stats = useMemo(() => {
    const totalFiles = reconstructedFiles.length;
    const totalChanges = reconstructedFiles.reduce((sum, file) => sum + file.totalChanges, 0);
    const hasChanges = totalChanges > 0;
    
    return { totalFiles, totalChanges, hasChanges };
  }, [reconstructedFiles]);

  const toggleFileExpansion = (filename: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedFiles(newExpanded);
  };

  const handleCopyFile = async (file: ReconstructedFile) => {
    try {
      await copyToClipboard(file.correctedContent);
      showSuccess('File copied!', `${file.filename} copied to clipboard`);
    } catch (error) {
      showError('Copy failed', 'Unable to copy file to clipboard');
    }
  };

  const handleCopyAllFiles = async () => {
    try {
      if (reconstructedFiles.length === 1) {
        await copyToClipboard(reconstructedFiles[0].correctedContent);
        showSuccess('File copied!', 'File copied to clipboard');
      } else {
        // For multiple files, create a structured format
        const allContent = reconstructedFiles
          .map(file => `// File: ${file.filename}\n${file.correctedContent}`)
          .join('\n\n// ==========================================\n\n');
        
        await copyToClipboard(allContent);
        showSuccess('All files copied!', `${reconstructedFiles.length} files copied to clipboard`);
      }
    } catch (error) {
      showError('Copy failed', 'Unable to copy files to clipboard');
    }
  };

  const handleDownloadFile = (file: ReconstructedFile) => {
    if (onDownloadFile) {
      onDownloadFile(file);
    } else {
      // Default download implementation
      const blob = new Blob([file.correctedContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('File downloaded!', `${file.filename} downloaded`);
    }
  };

  const handleDownloadAll = () => {
    if (onDownloadAll) {
      onDownloadAll(reconstructedFiles);
    } else if (reconstructedFiles.length === 1) {
      handleDownloadFile(reconstructedFiles[0]);
    } else {
      // Create a zip-like text file with all files
      const allFilesContent = reconstructedFiles
        .map(file => `=== ${file.filename} ===\n${file.correctedContent}`)
        .join('\n\n');
      
      const blob = new Blob([allFilesContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'corrected_files.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('Files downloaded!', 'All files downloaded as corrected_files.txt');
    }
  };

  if (reconstructedFiles.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2 dark:text-gray-100">No Ready Files</h3>
        <p className="text-gray-500 text-sm dark:text-gray-400">
          Execute some steps and accept patches to see reconstructed files here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and actions */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-black">
              ✅ Ready Files ({stats.totalFiles})
            </h3>
            <p className="text-sm text-black">
              {stats.hasChanges 
                ? `${stats.totalChanges} total changes applied across all files`
                : 'Files are ready to use (no changes needed)'
              }
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleCopyAllFiles}
              className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-colors duration-200 dark:bg-green-500 dark:hover:bg-green-600"
            >
              Copy All
            </button>
            <button
              onClick={handleDownloadAll}
              className="px-3 py-2 bg-white text-green-700 text-sm font-medium border border-green-300 rounded-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-colors duration-200 dark:bg-gray-800 dark:text-green-400 dark:border-green-600 dark:hover:bg-gray-700"
            >
              Download All
            </button>
          </div>
        </div>
      </div>

      {/* View toggle for multiple files */}
      {reconstructedFiles.length > 1 && (
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg dark:bg-gray-800">
          <button
            onClick={() => setSelectedView('corrected')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${
              selectedView === 'corrected'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Ready Files
          </button>
          <button
            onClick={() => setSelectedView('diff')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${
              selectedView === 'diff'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Before/After
          </button>
        </div>
      )}

      {/* File list */}
      <div className="space-y-3">
        {reconstructedFiles.map((file) => {
          const isExpanded = expandedFiles.has(file.filename);
          
          return (
            <div
              key={file.filename}
              className="border border-gray-200 rounded-lg bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-800"
            >
              {/* File header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 dark:bg-gray-700 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleFileExpansion(file.filename)}
                      className="flex items-center space-x-2 text-left"
                    >
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${
                          isExpanded ? 'transform rotate-90' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{file.filename}</span>
                    </button>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded dark:bg-blue-900 dark:text-blue-200">
                      {file.language}
                    </span>
                    {file.totalChanges > 0 && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded dark:bg-green-900 dark:text-green-200">
                        {file.changesSummary}
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleCopyFile(file)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="px-3 py-1 bg-white text-blue-600 text-xs font-medium border border-blue-300 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-600 dark:hover:bg-gray-700"
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>

              {/* File content */}
              {isExpanded && (
                <div className="p-4">
                  {selectedView === 'corrected' || reconstructedFiles.length === 1 ? (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2 dark:text-gray-100">Ready to use:</h4>
                      <pre className="bg-gray-50 border rounded-lg p-3 text-sm overflow-x-auto dark:bg-gray-900 dark:border-gray-600">
                        <code className={`language-${file.language} dark:text-gray-300`}>
                          {file.correctedContent}
                        </code>
                      </pre>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2 dark:text-gray-100">Original:</h4>
                        <pre className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm overflow-x-auto max-h-64 dark:bg-red-900/20 dark:border-red-800">
                          <code className={`language-${file.language} dark:text-gray-300`}>
                            {file.originalContent}
                          </code>
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2 dark:text-gray-100">Corrected:</h4>
                        <pre className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm overflow-x-auto max-h-64 dark:bg-green-900/20 dark:border-green-800">
                          <code className={`language-${file.language} dark:text-gray-300`}>
                            {file.correctedContent}
                          </code>
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};