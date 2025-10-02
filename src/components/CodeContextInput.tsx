'use client';

import React, { useState, useCallback, useMemo } from 'react';
import CodeEditor from '@uiw/react-textarea-code-editor';

interface CodeContextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Language detection based on common patterns and keywords
const detectLanguage = (code: string): string => {
  if (!code.trim()) return 'text';
  
  const lowerCode = code.toLowerCase();
  
  // JavaScript/TypeScript patterns
  if (lowerCode.includes('function') || lowerCode.includes('const ') || 
      lowerCode.includes('let ') || lowerCode.includes('var ') ||
      lowerCode.includes('import ') || lowerCode.includes('export ')) {
    if (lowerCode.includes('interface ') || lowerCode.includes('type ') ||
        lowerCode.includes(': string') || lowerCode.includes(': number')) {
      return 'typescript';
    }
    return 'javascript';
  }
  
  // Python patterns
  if (lowerCode.includes('def ') || lowerCode.includes('import ') ||
      lowerCode.includes('from ') || lowerCode.includes('class ') ||
      lowerCode.includes('if __name__')) {
    return 'python';
  }
  
  // Java patterns
  if (lowerCode.includes('public class') || lowerCode.includes('private ') ||
      lowerCode.includes('public static void main') || lowerCode.includes('package ')) {
    return 'java';
  }
  
  // C/C++ patterns
  if (lowerCode.includes('#include') || lowerCode.includes('int main') ||
      lowerCode.includes('printf') || lowerCode.includes('cout')) {
    return 'cpp';
  }
  
  // HTML patterns
  if (lowerCode.includes('<html') || lowerCode.includes('<!doctype') ||
      lowerCode.includes('<div') || lowerCode.includes('<body')) {
    return 'html';
  }
  
  // CSS patterns
  if (lowerCode.includes('{') && lowerCode.includes('}') &&
      (lowerCode.includes('color:') || lowerCode.includes('margin:') ||
       lowerCode.includes('padding:') || lowerCode.includes('display:'))) {
    return 'css';
  }
  
  // JSON patterns
  if ((lowerCode.startsWith('{') && lowerCode.endsWith('}')) ||
      (lowerCode.startsWith('[') && lowerCode.endsWith(']'))) {
    try {
      JSON.parse(code);
      return 'json';
    } catch {
      // Not valid JSON, continue with other checks
    }
  }
  
  // Default to text if no pattern matches
  return 'text';
};

export const CodeContextInput: React.FC<CodeContextInputProps> = ({
  value,
  onChange,
  placeholder = "Paste your existing code here (optional)...",
  className = ""
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  // Detect language from code content
  const detectedLanguage = useMemo(() => detectLanguage(value), [value]);
  
  // Handle change with debouncing for large inputs
  const handleChange = useCallback((val: string) => {
    onChange(val);
  }, [onChange]);
  
  // Handle focus states
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);
  
  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);
  
  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Code Context
        </label>
        {value && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {detectedLanguage} • {value.length} chars
          </span>
        )}
      </div>
      
      <div className={`
        relative border rounded-lg overflow-hidden transition-all duration-200
        ${isFocused ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-300'}
        ${value.length > 10000 ? 'border-amber-300' : ''}
      `}>
        <CodeEditor
          value={value}
          language={detectedLanguage}
          placeholder={placeholder}
          onChange={(evn) => handleChange(evn.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          padding={16}
          style={{
            fontSize: 14,
            backgroundColor: '#fafafa',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            minHeight: '120px',
            maxHeight: '400px',
            overflow: 'auto',
          }}
          data-color-mode="light"
        />
      </div>
      
      {/* Performance warning for large inputs */}
      {value.length > 10000 && (
        <div className="mt-2 text-sm text-amber-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Large code input detected. Consider breaking into smaller chunks for better performance.
        </div>
      )}
      
      {/* Helper text */}
      <p className="mt-2 text-sm text-gray-500">
        Paste your existing code to provide context for the AI. Language will be auto-detected.
      </p>
    </div>
  );
};

export default CodeContextInput;