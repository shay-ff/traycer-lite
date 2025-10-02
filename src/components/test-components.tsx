'use client';

import React, { useState } from 'react';
import { IntentForm } from './IntentForm';

// Simple test component to verify the form components work
export const TestComponents: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: { codeContext: string; intent: string }) => {
    setLoading(true);
    setError(null);
    
    console.log('Form submitted with data:', data);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      // Simulate success or error
      if (data.intent.toLowerCase().includes('error')) {
        setError('Simulated API error for testing');
      } else {
        console.log('Plan would be generated here');
      }
    }, 2000);
  };

  return (
    <div className="p-8">
      <IntentForm
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
      />
    </div>
  );
};

export default TestComponents;