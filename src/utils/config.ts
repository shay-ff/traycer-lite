import { GroqConfig } from '@/types';

/**
 * Get Groq API configuration from environment variables
 */
export function getGroqConfig(): GroqConfig {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is required');
  }

  return {
    apiKey,
    model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
    maxTokens: parseInt(process.env.GROQ_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.GROQ_TEMPERATURE || '0.1'),
  };
}

/**
 * Validate that all required environment variables are set
 */
export function validateEnvironment(): void {
  const requiredVars = ['GROQ_API_KEY'];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }
}