'use client';

import React, { useState, useCallback } from 'react';
import { CodeContextInput } from './CodeContextInput';
import { useToastHelpers } from './Toast';
import { ButtonLoader } from './LoadingIndicator';
import { getErrorMessage } from '@/utils/api';

interface IntentFormData {
  codeContext: string;
  intent: string;
}

interface IntentFormProps {
  onSubmit: (data: IntentFormData) => void;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export const IntentForm: React.FC<IntentFormProps> = ({
  onSubmit,
  loading = false,
  error = null,
  className = ""
}) => {
  const [formData, setFormData] = useState<IntentFormData>({
    codeContext: '',
    intent: ''
  });
  
  const [validationErrors, setValidationErrors] = useState<{
    intent?: string;
  }>({});
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { error: showError, success: showSuccess } = useToastHelpers();
  
  // Handle code context changes
  const handleCodeContextChange = useCallback((value: string) => {
    setFormData(prev => ({
      ...prev,
      codeContext: value
    }));
  }, []);
  
  // Handle intent changes
  const handleIntentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      intent: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors.intent && value.trim()) {
      setValidationErrors(prev => ({
        ...prev,
        intent: undefined
      }));
    }
  }, [validationErrors.intent]);
  
  // Validate form
  const validateForm = useCallback((): boolean => {
    const errors: { intent?: string } = {};
    
    if (!formData.intent.trim()) {
      errors.intent = 'Intent is required. Please describe what you want to implement.';
    } else if (formData.intent.trim().length < 10) {
      errors.intent = 'Please provide a more detailed description (at least 10 characters).';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.intent]);
  
  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    
    if (validateForm()) {
      try {
        onSubmit(formData);
        showSuccess('Plan generation started', 'Your request is being processed...');
      } catch (err) {
        const errorMessage = getErrorMessage(err as Error);
        showError('Failed to generate plan', errorMessage);
      }
    }
  }, [formData, validateForm, onSubmit, showSuccess, showError]);
  
  // Handle reset
  const handleReset = useCallback(() => {
    setFormData({
      codeContext: '',
      intent: ''
    });
    setValidationErrors({});
    setIsSubmitted(false);
  }, []);
  
  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Create Implementation Plan
          </h2>
          <p className="text-gray-600">
            Describe what you want to implement, and optionally provide existing code for context.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Code Context Input */}
          <CodeContextInput
            value={formData.codeContext}
            onChange={handleCodeContextChange}
            className="w-full"
          />
          
          {/* Intent Input */}
          <div>
            <label htmlFor="intent" className="block text-sm font-medium text-gray-700 mb-2">
              What do you want to implement? *
            </label>
            <textarea
              id="intent"
              value={formData.intent}
              onChange={handleIntentChange}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Describe what you want to build or modify. Be as specific as possible about the functionality, requirements, and expected behavior..."
              rows={4}
              className={`
                w-full px-4 py-3 border rounded-lg resize-vertical transition-all duration-200
                focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none
                text-gray-900 placeholder-gray-500 bg-white
                ${validationErrors.intent ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              disabled={loading}
              required
            />
            
            {/* Intent validation error */}
            {validationErrors.intent && (
              <div className="mt-2 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {validationErrors.intent}
              </div>
            )}
            
            {/* Character count */}
            <div className="mt-2 text-sm text-gray-500">
              {formData.intent.length} characters
              {formData.intent.length > 0 && formData.intent.length < 10 && (
                <span className="text-amber-600 ml-2">
                  (minimum 10 characters)
                </span>
              )}
              <span className="ml-2 text-gray-400">
                • Press Ctrl+Enter to submit
              </span>
            </div>
          </div>
          
          {/* API Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Failed to generate plan
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleReset}
              disabled={loading || (!formData.codeContext && !formData.intent)}
              className="
                px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 
                rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200
              "
            >
              Clear Form
            </button>
            
            <button
              type="submit"
              disabled={loading || !formData.intent.trim()}
              className="
                px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent 
                rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200
                flex items-center
              "
            >
              {loading ? (
                <ButtonLoader text="Generating Plan..." />
              ) : (
                'Generate Plan'
              )}
            </button>
          </div>
        </form>
        
        {/* Form Tips */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Tips for better results:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Be specific about what you want to build or modify</li>
            <li>• Include relevant existing code to provide context</li>
            <li>• Mention the programming language and framework if applicable</li>
            <li>• Describe the expected behavior and any constraints</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default IntentForm;