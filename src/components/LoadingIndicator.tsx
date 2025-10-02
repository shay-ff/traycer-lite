'use client';

import React from 'react';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  color?: 'blue' | 'gray' | 'white' | 'green' | 'red';
  text?: string;
  className?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'md',
  variant = 'spinner',
  color = 'blue',
  text,
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-6 h-6';
      case 'lg':
        return 'w-8 h-8';
      case 'xl':
        return 'w-12 h-12';
      default:
        return 'w-6 h-6';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'blue':
        return 'text-blue-600';
      case 'gray':
        return 'text-gray-600';
      case 'white':
        return 'text-white';
      case 'green':
        return 'text-green-600';
      case 'red':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const getTextSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'md':
        return 'text-sm';
      case 'lg':
        return 'text-base';
      case 'xl':
        return 'text-lg';
      default:
        return 'text-sm';
    }
  };

  const renderSpinner = () => (
    <svg
      className={`animate-spin ${getSizeClasses()} ${getColorClasses()}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const renderDots = () => (
    <div className={`flex space-x-1 ${getColorClasses()}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${getSizeClasses().replace('w-', 'w-').replace('h-', 'h-').split(' ')[0].replace('w-', 'w-2 h-2')} bg-current rounded-full animate-pulse`}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div
      className={`${getSizeClasses()} ${getColorClasses()} bg-current rounded-full animate-pulse opacity-75`}
    />
  );

  const renderBars = () => (
    <div className={`flex items-end space-x-1 ${getColorClasses()}`}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-1 bg-current rounded-sm animate-pulse`}
          style={{
            height: `${12 + (i % 2) * 8}px`,
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1.2s'
          }}
        />
      ))}
    </div>
  );

  const renderIndicator = () => {
    switch (variant) {
      case 'spinner':
        return renderSpinner();
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'bars':
        return renderBars();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        {renderIndicator()}
        {text && (
          <span className={`${getTextSizeClasses()} ${getColorClasses()} font-medium`}>
            {text}
          </span>
        )}
      </div>
    </div>
  );
};

// Specialized loading components for common use cases
export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="min-h-[400px] flex items-center justify-center">
    <LoadingIndicator size="lg" text={text} />
  </div>
);

export const ButtonLoader: React.FC<{ text?: string }> = ({ text }) => (
  <div className="flex items-center">
    <LoadingIndicator size="sm" color="white" className="mr-2" />
    {text && <span>{text}</span>}
  </div>
);

export const InlineLoader: React.FC<{ text?: string }> = ({ text }) => (
  <div className="flex items-center space-x-2">
    <LoadingIndicator size="sm" variant="dots" />
    {text && <span className="text-sm text-gray-600">{text}</span>}
  </div>
);

// Progress indicator for multi-step operations
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepLabels,
  className = ''
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className={`w-full ${className}`}>
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Step indicator */}
      <div className="flex justify-between text-xs text-gray-600">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      
      {/* Current step label */}
      {stepLabels && stepLabels[currentStep - 1] && (
        <div className="mt-2 text-sm text-gray-700 font-medium">
          {stepLabels[currentStep - 1]}
        </div>
      )}
    </div>
  );
};

export default LoadingIndicator;